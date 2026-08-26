#!/usr/bin/env python3
"""
Refactored NFC Service with enterprise-grade error handling and configuration
"""

import asyncio
import json
import logging
import queue
import time
import threading
from contextlib import contextmanager
from concurrent import futures
from dataclasses import dataclass, asdict, field
from enum import Enum
from typing import Optional, Dict, Any, Callable, Union
from threading import Lock

try:
    import board
    import busio
    from digitalio import DigitalInOut
    from adafruit_pn532.spi import PN532_SPI
    HARDWARE_AVAILABLE = True
except ImportError:
    HARDWARE_AVAILABLE = False
    logging.warning("NFC hardware libraries not available")

from config import config

logger = logging.getLogger(__name__)


class NFCError(Exception):
    """Base exception for NFC operations"""
    pass


class NFCHardwareError(NFCError):
    """Hardware-related errors"""
    pass


class NFCDataError(NFCError):
    """Data validation/format errors"""
    pass


class NFCTimeoutError(NFCError):
    """Operation timeout errors"""
    pass


class TagType(Enum):
    """Supported NFC tag types"""
    NTAG213 = "ntag213"
    NTAG215 = "ntag215"
    NTAG216 = "ntag216"
    UNKNOWN = "unknown"
    
    @property
    def capacity(self) -> int:
        """Get tag capacity in bytes"""
        capacities = {
            TagType.NTAG213: 144,
            TagType.NTAG215: 496,
            TagType.NTAG216: 872,
            TagType.UNKNOWN: 0
        }
        return capacities.get(self, 0)


@dataclass
class TagInfo:
    """NFC tag information"""
    uid: str
    type: TagType
    capacity: int
    locked: bool = False
    data: Optional[Dict[str, Any]] = None


@dataclass
class WriteResult:
    """Result of write operation"""
    success: bool
    tag_uid: str
    bytes_written: int
    error: Optional[str] = None
    retry_count: int = 0


class ScanState:
    """Manages scanning state for cradle-based interaction"""
    
    def __init__(self, grace_period: float = 1.5):
        self.current_tag_id: Optional[str] = None
        self.last_seen_time: float = 0
        self.grace_period = grace_period
        self._write_in_progress = False
        
    def should_emit_event(self, tag_id: str, current_time: float) -> bool:
        """Determine if we should emit a tag_scanned event"""
        # During write operations, don't emit scan events
        if self._write_in_progress:
            return False
            
        # If no tag was present, any tag triggers event
        if self.current_tag_id is None:
            self.current_tag_id = tag_id
            self.last_seen_time = current_time
            return True
            
        # If different tag detected, immediate event
        if tag_id != self.current_tag_id:
            self.current_tag_id = tag_id
            self.last_seen_time = current_time
            return True
            
        # Same tag still present - just update timestamp
        self.last_seen_time = current_time
        return False
        
    def process_no_tag_detected(self, current_time: float):
        """Handle absence of tag detection"""
        # Clear current tag if grace period exceeded
        if self.current_tag_id and (current_time - self.last_seen_time > self.grace_period):
            logger.debug(f"Tag {self.current_tag_id} removed after {self.grace_period}s grace period")
            self.current_tag_id = None
            
    def set_write_mode(self, enabled: bool, settled_tag_id: Optional[str] = None):
        """Toggle write suppression around a registration.

        On release, pass the tag that was just written: it is still sitting on
        the reader, and treating it as newly-arrived makes it re-emit
        immediately, which navigates the UI away and restarts the modal. Marking
        it as already-present means the next event comes only after the box is
        lifted and something is presented again.
        """
        self._write_in_progress = enabled
        if enabled:
            logger.debug("Write mode enabled - scan events suppressed")
        else:
            logger.debug("Write mode disabled - scan events resumed")
            self.current_tag_id = settled_tag_id
            self.last_seen_time = time.time() if settled_tag_id else 0


@dataclass
class _ReaderCommand:
    """A unit of work for the reader thread."""
    kind: str
    payload: Any = None
    timeout: float = 20.0
    future: "futures.Future" = field(default_factory=lambda: futures.Future())


class NFCService:
    """Enterprise-grade NFC service with robust error handling"""
    
    def __init__(self, nfc_config=None, fall_back_to_mock: bool = True):
        self.config = nfc_config or config.nfc
        self._pn532 = None
        self._cs_pin = None
        self._running = False
        self._thread = None
        self._commands: "queue.Queue[_ReaderCommand]" = queue.Queue()
        self._current_command = None
        # Liveness. Silent failure has been the recurring cost here -- a dead
        # reader and a dead scan loop both previously looked identical to a
        # healthy one from outside.
        self._last_poll_at = 0.0
        self._last_tag_at = 0.0
        self._last_written_uid = None
        self._last_write_time = 0
        self._write_cooldown_cache = {}  # uid -> timestamp
        self._scan_state = ScanState(grace_period=1.5)
        # Set while a registration owns the reader. The scanning thread checks
        # this before every hardware access: interleaved read_passive_target
        # calls re-run RF select and corrupt an in-progress NDEF write.
        # Refcount so overlapping registrations do not release each other's
        # pause, and a deadline so a pause that is never released cannot kill
        # scanning permanently.
        self._scan_queue = queue.Queue()  # Thread-safe queue for scan events
        self._scan_callback = None
        self._degraded = False

        # Initialize hardware if not in mock mode
        if not self.config.mock_mode:
            try:
                self._initialize_hardware()
            except NFCHardwareError:
                if not fall_back_to_mock:
                    raise
                # Mock mode was NOT requested -- this is a failure, so say so at
                # ERROR rather than letting a broken reader look like dev mode.
                logger.error(
                    "NFC hardware initialization failed - falling back to mock mode. "
                    "The reader will NOT work until this is resolved."
                )
                self.config.mock_mode = True
                self._degraded = True
    
    @property
    def mock_mode(self) -> bool:
        """True when no real reader is driving this service."""
        return self.config.mock_mode

    @property
    def degraded(self) -> bool:
        """True when mock mode was forced by a hardware failure, not requested.

        Lets callers distinguish "developing off-Pi" from "the reader is broken",
        which the old code could not do -- both looked like mock mode.
        """
        return self._degraded

    def _initialize_hardware(self) -> None:
        """Initialize NFC hardware with retry logic"""
        if not HARDWARE_AVAILABLE:
            logger.error("NFC hardware libraries not available")
            raise NFCHardwareError("Required hardware libraries not installed")

        max_attempts = 3
        for attempt in range(max_attempts):
            cs_pin = None
            try:
                logger.info(f"Initializing NFC hardware (attempt {attempt + 1}/{max_attempts})")

                # Release anything held by a previous attempt. Without this, each
                # failed attempt leaks its CS handle and the next one dies with
                # "GPIO busy" -- which would make the reinit-on-error recovery
                # path break itself after a few failures.
                self._release_hardware()

                # Try SPI first (original working configuration)
                try:
                    logger.info(f"Attempting SPI connection (CS pin {self.config.cs_pin})...")
                    spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
                    cs_pin = DigitalInOut(getattr(board, self.config.cs_pin))
                    self._cs_pin = cs_pin
                    self._pn532 = PN532_SPI(spi, cs_pin, debug=False)

                    # Verify connection
                    ic, ver, rev, support = self._pn532.firmware_version
                    logger.info(f"✅ SPI connection successful! PN532 Firmware: {ver}.{rev}")

                except Exception as spi_error:
                    logger.warning(f"SPI failed: {spi_error}, trying I2C...")

                    # Fall back to I2C
                    logger.info("Attempting I2C connection (address 0x24)...")
                    i2c = busio.I2C(board.SCL, board.SDA)

                    # Import I2C module
                    from adafruit_pn532.i2c import PN532_I2C

                    # Create PN532 instance with I2C
                    self._pn532 = PN532_I2C(i2c, debug=False)

                    # Verify connection
                    ic, ver, rev, support = self._pn532.firmware_version
                    logger.info(f"✅ I2C connection successful! PN532 Firmware: {ver}.{rev}")

                # Configure SAM (Secure Access Module)
                self._pn532.SAM_configuration()
                logger.info("NFC hardware initialized successfully")
                return

            except Exception as e:
                logger.error(f"Hardware initialization attempt {attempt + 1} failed: {e}")
                if attempt < max_attempts - 1:
                    logger.info("Retrying in 1 second...")
                    time.sleep(1)
                else:
                    self._release_hardware()
                    raise NFCHardwareError(f"Failed to initialize hardware after {max_attempts} attempts: {e}")
    
    def _release_hardware(self) -> None:
        """Release CS pin and reader handle so a retry can re-acquire them.

        CircuitPython pins are exclusive: re-creating DigitalInOut for a pin that
        is still held raises "GPIO busy". Failed attempts must clean up or
        recovery becomes impossible after the first few.
        """
        pin = getattr(self, '_cs_pin', None)
        if pin is not None:
            try:
                pin.deinit()
            except Exception as e:
                logger.debug(f"CS pin deinit failed (continuing): {e}")
            self._cs_pin = None
        self._pn532 = None

    def detect_tag_type(self, uid: bytes) -> TagType:
        """Detect NFC tag type based on UID and other characteristics"""
        # Simplified detection - in production, would check SAK/ATQA values
        if len(uid) == 7:
            # Likely NTAG series
            return TagType.NTAG213  # Would need more info to distinguish
        return TagType.UNKNOWN
    
    def validate_json_data(self, data: Dict[str, Any]) -> None:
        """Validate JSON data before writing to tag"""
        if not isinstance(data, dict):
            raise NFCDataError("Data must be a dictionary")
        
        # Check required fields
        required_fields = ['v', 'id', 'geo', 'ts']
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            raise NFCDataError(f"Missing required fields: {missing_fields}")
        
        # Validate data types
        if not isinstance(data['v'], int):
            raise NFCDataError("Version 'v' must be an integer")
        
        if not isinstance(data['geo'], list) or len(data['geo']) != 2:
            raise NFCDataError("Geo 'geo' must be a list of two numbers")
        
        if not isinstance(data['ts'], (int, float)):
            raise NFCDataError("Timestamp 'ts' must be a number")
        
        # Check data size
        json_str = json.dumps(data, separators=(',', ':'))
        if len(json_str.encode('utf-8')) > self.config.max_tag_data_size - 20:  # Reserve space for NDEF headers
            raise NFCDataError(f"Data too large for tag: {len(json_str)} bytes")
    
    # ------------------------------------------------------------------
    # Reader-thread operations.
    #
    # Everything below runs ON the reader thread and is the only code that
    # touches self._pn532. No locking: exclusivity is structural, because
    # there is exactly one caller. Callers on the event loop reach these
    # through submit()/register_tag(), which return awaitable futures.
    # ------------------------------------------------------------------

    def _do_wait_for_tag(self, timeout: float) -> TagInfo:
        """Block until a tag is present. Reader thread only."""
        if self.config.mock_mode:
            time.sleep(0.5)
            return TagInfo(uid="01:23:45:67:89:AB:CD", type=TagType.NTAG213,
                           capacity=144, locked=False)

        deadline = time.time() + timeout
        while time.time() < deadline:
            uid = self._pn532.read_passive_target(timeout=0.3)
            if not uid:
                # The RF field must cycle between polls. Reading back-to-back
                # keeps it energised and the tag is never re-selected, so a tag
                # sitting on the reader is simply never seen. The idle scan loop
                # gets this gap for free from its command-queue wait, which is
                # why it detected tags while registration did not.
                time.sleep(0.1)
                continue
            if uid:
                uid_str = ':'.join(f"{b:02X}" for b in uid)
                tag_type = self.detect_tag_type(uid)
                logger.info(f"Tag detected: {uid_str} (type: {tag_type.value})")
                return TagInfo(uid=uid_str, type=tag_type,
                               capacity=tag_type.capacity, locked=False)
        raise NFCTimeoutError(f"No tag detected within {timeout} seconds")

    def _do_write(self, tag_info: TagInfo, data: Dict[str, Any]) -> WriteResult:
        """Write and verify. Reader thread only."""
        self.validate_json_data(data)

        if self.config.mock_mode:
            time.sleep(0.3)
            return WriteResult(success=True, tag_uid=tag_info.uid,
                               bytes_written=len(json.dumps(data)), retry_count=0)

        payload = json.dumps(data, separators=(',', ':'))
        ndef = self._create_text_ndef(payload)
        last_error = None
        for attempt in range(self.config.write_retry_attempts):
            try:
                if not self._write_ndef_data_sync(ndef):
                    last_error = "write reported failure"
                    continue
                # Read back and compare. A write that reports success but does
                # not persist is the worst outcome here: the registry records a
                # binding that the physical tag does not carry.
                readback = self._read_json_from_tag_sync()
                if readback and readback.get('id') == data.get('id'):
                    return WriteResult(success=True, tag_uid=tag_info.uid,
                                       bytes_written=len(ndef), retry_count=attempt)
                last_error = "verification failed - tag did not read back what was written"
                logger.warning(f"{last_error} (attempt {attempt + 1})")
            except Exception as e:
                last_error = str(e)
                logger.error(f"Write attempt {attempt + 1} failed: {e}")
            time.sleep(self.config.write_retry_delay)

        return WriteResult(success=False, tag_uid=tag_info.uid, bytes_written=0,
                           retry_count=self.config.write_retry_attempts,
                           error=last_error or "write failed")

    def _do_register(self, data: Dict[str, Any], timeout: float) -> WriteResult:
        """Wait for a tag then write it, as one indivisible operation.

        Combining these matters: between the wait and the write nothing else
        can touch the reader, so the tag selected by the wait is guaranteed to
        be the tag written. Previously these were separate calls that the
        scanning loop could interleave with, re-selecting the tag mid-write.
        """
        tag_info = self._do_wait_for_tag(timeout)
        self._scan_state.set_write_mode(True)
        try:
            result = self._do_write(tag_info, data)
        finally:
            # The tag is still sitting on the reader; mark it present so it
            # does not immediately re-emit and navigate the UI away.
            self._scan_state.set_write_mode(False, settled_tag_id=tag_info.uid)
        return result

    def _do_read(self, _unused=None) -> Optional[Dict[str, Any]]:
        """Read JSON from whatever tag is present. Reader thread only."""
        if self.config.mock_mode:
            return None
        return self._read_json_from_tag_sync()

    # ------------------------------------------------------------------
    # The reader thread: sole owner of the PN532.
    # ------------------------------------------------------------------

    def start(self, callback: Callable[[Dict[str, Any]], Any]) -> None:
        """Start the reader thread. It owns the device for its lifetime."""
        if self._running:
            logger.warning("Reader already running")
            return
        self._running = True
        self._scan_callback = callback
        self._thread = threading.Thread(target=self._reader_loop, daemon=True,
                                        name="pn532-reader")
        self._thread.start()
        logger.info("Reader thread started")

    def stop(self) -> None:
        """Stop the reader thread and fail any queued commands."""
        if not self._running:
            return
        logger.info("Stopping reader thread...")
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
            if self._thread.is_alive():
                logger.warning("Reader thread did not stop cleanly")
        while True:
            try:
                cmd = self._commands.get_nowait()
            except queue.Empty:
                break
            if not cmd.future.done():
                cmd.future.set_exception(NFCHardwareError("Reader stopped"))
        logger.info("Reader thread stopped")

    def submit(self, kind: str, payload: Any = None,
               timeout: float = 20.0) -> "futures.Future":
        """Queue a command for the reader thread. Returns a Future."""
        if not self._running:
            f = futures.Future()
            f.set_exception(NFCHardwareError("Reader is not running"))
            return f
        cmd = _ReaderCommand(kind=kind, payload=payload, timeout=timeout)
        self._commands.put(cmd)
        return cmd.future

    async def register_tag(self, data: Dict[str, Any],
                           timeout: float = 20.0) -> WriteResult:
        """Wait for a tag and write it, awaited from the event loop."""
        return await asyncio.wrap_future(
            self.submit('register', payload=data, timeout=timeout))

    @property
    def busy(self) -> bool:
        """True when a command is queued or executing."""
        return self._current_command is not None or not self._commands.empty()

    def _reader_loop(self) -> None:
        """Run commands when there are any; otherwise scan.

        This is the whole concurrency design. A registration is not something
        that has to interrupt scanning and ask it to stand down -- it is simply
        the next thing this loop does, and scanning resumes when it finishes.
        """
        errors = 0
        while self._running:
            try:
                cmd = self._commands.get(timeout=0.05)
            except queue.Empty:
                cmd = None

            if cmd is not None:
                self._run_command(cmd)
                continue

            try:
                self._idle_poll()
                self._last_poll_at = time.time()
                errors = 0
            except Exception as e:
                errors += 1
                logger.error(f"Reader poll error ({errors}): {e}")
                if errors >= 5:
                    logger.warning(
                        f"{errors} consecutive reader errors - reinitializing "
                        "PN532. If this repeats, suspect the bus or wiring.")
                    try:
                        self._initialize_hardware()
                        errors = 0
                        logger.info("PN532 reinitialized after errors")
                    except Exception as init_error:
                        logger.error(f"Reinitialization failed: {init_error}")
                        time.sleep(5)
                time.sleep(1)

    def _run_command(self, cmd: "_ReaderCommand") -> None:
        self._current_command = cmd
        started = time.time()
        try:
            if cmd.kind == 'register':
                result = self._do_register(cmd.payload, cmd.timeout)
            elif cmd.kind == 'wait':
                result = self._do_wait_for_tag(cmd.timeout)
            elif cmd.kind == 'read':
                result = self._do_read(cmd.payload)
            else:
                raise ValueError(f"Unknown reader command: {cmd.kind}")
            if not cmd.future.done():
                cmd.future.set_result(result)
        except Exception as e:
            logger.info(f"Reader command '{cmd.kind}' failed after "
                        f"{time.time() - started:.1f}s: {e}")
            if not cmd.future.done():
                cmd.future.set_exception(e)
        finally:
            self._current_command = None

    def _idle_poll(self) -> None:
        """One scan cycle. Emits an event when a tag arrives."""
        now = time.time()
        if self.config.mock_mode:
            time.sleep(0.05)
            return

        uid = self._pn532.read_passive_target(timeout=0.3)
        if not uid:
            self._scan_state.process_no_tag_detected(now)
            return

        uid_str = ':'.join(f"{b:02X}" for b in uid)
        if not self._scan_state.should_emit_event(uid_str, now):
            return

        data = None
        try:
            data = self._read_json_from_tag_sync()
        except Exception as e:
            logger.error(f"Error reading tag data: {e}")

        if data:
            logger.info(f"Tag scanned: {uid_str} - queuing event")
        else:
            logger.warning(f"Tag {uid_str} carries no entry data - needs registration")
        self._last_tag_at = now
        self._scan_queue.put({'uid': uid_str, 'data': data})

    async def process_scan_queue(self) -> None:
        """Deliver queued scan events on the event loop."""
        while self._running:
            try:
                event = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: self._scan_queue.get(timeout=0.1))
                if event and self._scan_callback:
                    await self._scan_callback(event)
            except queue.Empty:
                pass
            except Exception as e:
                logger.error(f"Error processing scan queue: {e}")
            await asyncio.sleep(0.01)

    def inject_mock_scan(self, entry_id: Optional[str] = None,
                         uid: str = "MOCK:01:23:45:67",
                         geo: Optional[list] = None) -> bool:
        """Inject a synthetic scan event (mock mode only).

        Lets the full tag_scanned path be exercised off-Pi. Pass entry_id=None to
        simulate an unregistered tag.
        """
        if not self.config.mock_mode:
            logger.warning("inject_mock_scan ignored - not in mock mode")
            return False

        data = None
        if entry_id:
            data = {
                'v': 1,
                'id': entry_id,
                'geo': geo or [-33.890542, 151.274856],
                'ts': int(time.time()),
            }
        self._scan_queue.put({'uid': uid, 'data': data})
        logger.info(f"Injected mock scan: uid={uid} entry_id={entry_id}")
        return True

    def stop_scanning(self) -> None:
        """Deprecated alias for stop()."""
        self.stop()
        return

    def _create_text_ndef(self, text: str) -> bytes:
        """Create NDEF text record (unchanged from original)"""
        text_bytes = text.encode('utf-8')
        
        # NDEF record
        ndef_flags = 0xD1  # MB=1, ME=1, SR=1, TNF=0x01
        type_length = 0x01
        payload_length = len(text_bytes) + 3  # +3 for status byte and "en"
        type_field = ord('T')
        
        # Text record payload
        status_byte = 0x02  # UTF-8, "en" is 2 chars
        language = b'en'
        
        # Build NDEF message
        ndef_message = bytes([
            ndef_flags,
            type_length,
            payload_length,
            type_field,
            status_byte
        ]) + language + text_bytes
        
        # Add TLV wrapper
        if len(ndef_message) < 255:
            ndef_data = bytes([0x03, len(ndef_message)]) + ndef_message + bytes([0xFE])
        else:
            ndef_data = bytes([0x03, 0xFF, 
                             (len(ndef_message) >> 8) & 0xFF,
                             len(ndef_message) & 0xFF]) + ndef_message + bytes([0xFE])
        
        return ndef_data
    
    def _write_ndef_data_sync(self, ndef_data: bytes) -> bool:
        """Synchronous NDEF write (unchanged from original)"""
        try:
            logger.debug(f"Writing {len(ndef_data)} bytes of NDEF data")
            
            # Clear existing data
            for page in range(4, 8):
                success = self._pn532.ntag2xx_write_block(page, [0x00, 0x00, 0x00, 0x00])
                if not success:
                    return False
                time.sleep(0.05)
            
            # Write new data
            start_page = 4
            pages_needed = (len(ndef_data) + 3) // 4
            
            for page_num in range(pages_needed):
                actual_page = start_page + page_num
                
                if actual_page > 39:  # NTAG213 limit
                    break
                
                start_idx = page_num * 4
                end_idx = min(start_idx + 4, len(ndef_data))
                page_data = list(ndef_data[start_idx:end_idx])
                
                while len(page_data) < 4:
                    page_data.append(0x00)
                
                success = self._pn532.ntag2xx_write_block(actual_page, page_data)
                if not success:
                    return False
                
                time.sleep(0.05)
            
            return True
            
        except Exception as e:
            logger.error(f"Error writing NDEF data: {e}")
            return False
    
    def _read_json_from_tag_sync(self) -> Optional[Dict[str, Any]]:
        """Synchronous JSON read with improved error handling"""
        try:
            # Read data from tag
            data = bytearray()
            for page in range(4, 40):
                block = self._pn532.ntag2xx_read_block(page)
                if block:
                    data.extend(block)
                else:
                    break
            
            # Parse NDEF TLV structure (unchanged logic)
            if len(data) > 2 and data[0] == 0x03:
                ndef_len = None
                ndef_start = None
                if data[1] == 0xFF:
                    if len(data) > 4:
                        ndef_len = (data[2] << 8) | data[3]
                        ndef_start = 4
                    else:
                        logger.warning("Truncated long-format NDEF TLV header on tag")
                        return None
                else:
                    ndef_len = data[1]
                    ndef_start = 2

                if len(data) >= ndef_start + ndef_len:
                    ndef_message = data[ndef_start:ndef_start + ndef_len]
                    
                    if len(ndef_message) > 5 and ndef_message[3] == 0x54:  # 'T' record
                        payload_len = ndef_message[2]
                        status_byte = ndef_message[4]
                        lang_len = status_byte & 0x3F
                        
                        text_start = 5 + lang_len
                        text_end = 4 + payload_len
                        
                        if len(ndef_message) >= text_end:
                            text_data = ndef_message[text_start:text_end]
                            text_str = text_data.decode('utf-8', errors='ignore')
                            
                            if text_str.startswith('{'):
                                return json.loads(text_str)
            
            logger.warning("No valid JSON found on tag")
            return None
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON on tag: {e}")
            return None
        except Exception as e:
            logger.error(f"Error reading tag: {e}")
            return None
    
    def get_status(self) -> Dict[str, Any]:
        """Status, including whether scanning is demonstrably alive.

        seconds_since_poll is the important one. "Is the reader working?" was
        previously unanswerable from outside: a dead reader, a dead scan loop
        and a healthy system all looked identical. A poll age that keeps
        climbing means scanning has stopped, whatever else claims to be fine.
        """
        now = time.time()
        return {
            'hardware_available': HARDWARE_AVAILABLE and self._pn532 is not None,
            'mock_mode': self.config.mock_mode,
            'degraded': self._degraded,
            'running': self._running,
            'busy': self.busy,
            'seconds_since_poll': (round(now - self._last_poll_at, 1)
                                   if self._last_poll_at else None),
            'seconds_since_tag': (round(now - self._last_tag_at, 1)
                                  if self._last_tag_at else None),
            'config': asdict(self.config)
        }

    @property
    def scanning_healthy(self) -> bool:
        """True when the reader loop has polled recently.

        The loop polls several times a second, so anything beyond a couple of
        seconds means it is wedged or dead.
        """
        if not self._running:
            return False
        if self.config.mock_mode:
            return True
        return bool(self._last_poll_at) and (time.time() - self._last_poll_at) < 5.0