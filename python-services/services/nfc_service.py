"""Single-owner NFC worker with verified NDEF registration."""
import asyncio
import logging
import queue
import threading
import time
from concurrent.futures import Future
from dataclasses import dataclass, field, asdict
from config import config
from services import nfc_codec
from services.nfc_backend import NfcpyBackend

logger = logging.getLogger(__name__)

class NFCError(Exception): pass
class NFCHardwareError(NFCError): pass
class NFCDataError(NFCError): pass
class NFCWriteError(NFCError): pass
class NFCTimeoutError(NFCError): pass
class NFCCancelledError(NFCError): pass

@dataclass
class WriteResult:
    success: bool
    tag_uid: str
    bytes_written: int = 0
    error: str = None
    retry_count: int = 0

@dataclass
class Command:
    payload: dict
    deadline: float
    bindings: dict
    future: Future = field(default_factory=Future)
    cancel: threading.Event = field(default_factory=threading.Event)

class NFCService:
    def __init__(self, nfc_config=None, backend=None, **_compat):
        self.config = nfc_config or config.nfc
        self.backend = backend or NfcpyBackend(self.config.device)
        self._running = False
        self._thread = None
        self._stop = threading.Event()
        self._commands = queue.Queue(maxsize=1)
        self._events = queue.Queue()
        self._lock = threading.Lock()
        self._pending = None
        self._connected = False
        self._last_poll = 0
        self._last_tag = 0
        self._present_uid = None
        self._seen = 0
        self._phase = 'stopped'
        self._last_error = None
        self._tag_details = None

    @property
    def mock_mode(self): return self.config.mock_mode
    @property
    def degraded(self): return not self.mock_mode and not self._connected
    @property
    def busy(self): return self._pending is not None

    def start(self, callback):
        if self._running: return
        self._callback = callback
        self._stop.clear()
        self._running = True
        self._thread = threading.Thread(target=self._loop, name='nfc-reader', daemon=True)
        self._thread.start()

    def stop(self):
        self._stop.set()
        self.cancel_registration()
        if self._thread:
            self._thread.join(timeout=8)
            if self._thread.is_alive():
                logger.error('NFC worker still stopping; phase=%s', self._phase)
        self._running = False

    def cancel_registration(self):
        with self._lock:
            if self._pending:
                self._pending.cancel.set()
                return True
        return False

    async def register_tag(self, data, timeout=20, bindings=None):
        nfc_codec.encode(data)
        with self._lock:
            if not self._running: raise NFCHardwareError('Reader is stopped')
            if self._pending: raise NFCError('A registration is already in progress')
            cmd = Command(dict(data), time.monotonic()+timeout, dict(bindings or {}))
            self._pending = cmd
            self._commands.put_nowait(cmd)
        try:
            return await asyncio.wrap_future(cmd.future)
        except asyncio.CancelledError:
            cmd.cancel.set()
            raise

    def _check(self, cmd):
        if self._stop.is_set() or cmd.cancel.is_set():
            raise NFCCancelledError('Registration cancelled; any completed write remains on the tag')
        if time.monotonic() >= cmd.deadline:
            raise NFCTimeoutError('Registration timed out; hold the sample still and retry')

    def _find(self, cmd, expected=None):
        while True:
            self._check(cmd)
            tag = self.backend.poll()
            self._last_poll = time.monotonic()
            if tag is not None:
                uid = self.backend.uid(tag)
                if expected and uid != expected:
                    raise NFCDataError(f'Tag changed: expected {expected}, found {uid}; write stopped')
                return tag
            self._stop.wait(0.1)

    def _register(self, cmd):
        self._check(cmd)
        payload = nfc_codec.encode(cmd.payload)
        if self.mock_mode:
            return WriteResult(True, 'MOCK:01:23:45:67', len(payload))
        self._phase = 'waiting'
        tag = self._find(cmd)
        uid = self.backend.uid(tag)
        self._present_uid, self._seen = uid, time.monotonic()
        owner = cmd.bindings.get(uid)
        if owner and owner != cmd.payload['id']:
            raise NFCDataError(f'Tag {uid} is already registered to entry {owner}')
        error = None
        for attempt in range(self.config.write_retry_attempts):
            self._check(cmd)
            try:
                self._phase = 'checking'
                # Read first on every attempt: an earlier write may have succeeded
                # even if the reader lost its acknowledgement.
                current = self.backend.read(tag)
                if current != payload:
                    self._check(cmd)
                    self._phase = 'writing'
                    self.backend.write(tag, payload)
                # Finish verification even if cancellation arrived during writing.
                # This allows a successful physical write to be persisted honestly.
                self._phase = 'verifying'
                fresh = self.backend.reselect()
                if fresh is None: raise NFCWriteError('Tag disappeared during verification')
                if self.backend.uid(fresh) != uid:
                    raise NFCDataError('Tag changed during verification; registration stopped')
                if self.backend.read(fresh) != payload:
                    raise NFCWriteError('Full NDEF read-back did not match')
                self._seen = time.monotonic()
                return WriteResult(True, uid, len(payload), retry_count=attempt)
            except (ValueError, NFCDataError):
                raise
            except Exception as exc:
                error = f'{self._phase}: {type(exc).__name__}: {exc}'
                logger.warning('NFC uid=%s attempt=%s error=%s', uid, attempt+1, error)
                if attempt+1 < self.config.write_retry_attempts:
                    self._check(cmd)
                    self._stop.wait(self.config.write_retry_delay)
                    tag = self._find(cmd, expected=uid)
        return WriteResult(False, uid, error=error, retry_count=self.config.write_retry_attempts)

    def _poll(self):
        tag = self.backend.poll()
        now = time.monotonic()
        self._last_poll = now
        if tag is None:
            if now-self._seen > 1.5: self._present_uid = None
            return
        uid = self.backend.uid(tag)
        self._seen = self._last_tag = now
        if uid == self._present_uid: return
        self._present_uid = uid
        data, error = None, None
        try:
            raw = self.backend.read(tag)
            data = nfc_codec.decode(raw) if raw else None
        except Exception as exc:
            error = f'{type(exc).__name__}: {exc}'
            logger.warning('Cannot decode tag %s: %s', uid, error)
        self._tag_details = {'uid': uid, 'type': type(tag).__name__, 'read_error': error}
        self._events.put({'uid': uid, 'data': data, 'error': error})

    def _loop(self):
        failures = 0
        try:
            while not self._stop.is_set():
                if not self.mock_mode and not self._connected:
                    self._phase = 'connecting'
                    try:
                        self.backend.open()
                        self._connected = True
                        self._last_error = None
                        logger.info('NFC connected: %s', self.config.device)
                    except Exception as exc:
                        self._last_error = str(exc)
                        self._phase = 'unavailable'
                        logger.error('NFC connection failed: %s', exc)
                        self._fail_pending(NFCHardwareError('Reader unavailable: '+str(exc)))
                        self._stop.wait(2)
                        continue
                try: cmd = self._commands.get(timeout=0.1)
                except queue.Empty: cmd = None
                if cmd:
                    try:
                        result = self._register(cmd)
                        if not cmd.future.done(): cmd.future.set_result(result)
                    except Exception as exc:
                        self._last_error = str(exc)
                        if not cmd.future.done(): cmd.future.set_exception(exc)
                    finally:
                        with self._lock: self._pending = None
                    continue
                self._phase = 'scanning'
                try:
                    if self.mock_mode: self._last_poll = time.monotonic()
                    else: self._poll()
                    failures = 0
                except Exception as exc:
                    failures += 1
                    self._last_error = str(exc)
                    logger.warning('NFC scan failure: %s', exc)
                    if failures >= 3:
                        self.backend.close()
                        self._connected = False
                    self._stop.wait(0.5)
        finally:
            self.backend.close()
            self._connected = False
            self._fail_pending(NFCHardwareError('Reader stopped'))
            self._phase = 'stopped'
            self._running = False

    def _fail_pending(self, exc):
        with self._lock:
            if self._pending and not self._pending.future.done():
                self._pending.future.set_exception(exc)
            self._pending = None
            while True:
                try: self._commands.get_nowait()
                except queue.Empty: break

    async def process_scan_queue(self):
        while self._running:
            try: event = self._events.get_nowait()
            except queue.Empty:
                await asyncio.sleep(0.05)
                continue
            try: await self._callback(event)
            except Exception: logger.exception('Scan event delivery failed')

    def inject_mock_scan(self, entry_id=None, uid='MOCK:01:23:45:67', geo=None):
        if not self.mock_mode: return False
        data = {'v':1, 'id':entry_id, 'geo':geo or [0,0], 'ts':int(time.time())} if entry_id else None
        self._events.put({'uid':uid, 'data':data})
        return True

    @property
    def scanning_healthy(self):
        if not self._running or (not self.mock_mode and not self._connected): return False
        pending = self._pending
        if pending is not None:
            return time.monotonic() < pending.deadline + 5
        return bool(self._last_poll) and time.monotonic()-self._last_poll < 5

    def get_status(self):
        now = time.monotonic()
        return {'hardware_available':self._connected, 'mock_mode':self.mock_mode,
                'degraded':self.degraded, 'running':self._running, 'busy':self.busy,
                'phase':self._phase, 'last_error':self._last_error, 'last_tag':self._tag_details,
                'seconds_since_poll':round(now-self._last_poll,1) if self._last_poll else None,
                'seconds_since_tag':round(now-self._last_tag,1) if self._last_tag else None,
                'config':asdict(self.config)}
