"""One idle clock for the physical display and grid, independent of browsers."""
import asyncio
import glob
import logging
import os
import struct
import time

logger = logging.getLogger(__name__)


class DisplayPower:
    def __init__(self):
        self.enabled = os.getenv('DISPLAY_STANDBY_ENABLED', 'false').lower() == 'true'
        self.output = os.getenv('DISPLAY_OUTPUT', 'HDMI-A-2')
        self.env = dict(os.environ,
                        XDG_RUNTIME_DIR=os.getenv('XDG_RUNTIME_DIR', f'/run/user/{os.getuid()}'),
                        WAYLAND_DISPLAY=os.getenv('WAYLAND_DISPLAY', 'wayland-0'))
        self.error = None

    async def set_awake(self, awake):
        if not self.enabled:
            return True
        try:
            process = await asyncio.create_subprocess_exec(
                'wlopm', '--on' if awake else '--off', self.output,
                env=self.env, stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.PIPE)
            try:
                _, error = await asyncio.wait_for(process.communicate(), 3)
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                raise RuntimeError('Display power command timed out')
            if process.returncode:
                raise RuntimeError(error.decode().strip() or 'Display power command failed')
            self.error = None
            return True
        except Exception as exc:
            self.error = str(exc)
            logger.warning('Display power: %s', exc)
            return False


class PhysicalInput:
    """Read activity only; never grab devices, log keys, or retain input values.

    The USB touchscreen keeps emitting input events with the HDMI output off,
    when Chromium cannot be relied upon to receive a wake tap.
    """
    EVENT = struct.Struct('@llHHi')

    def __init__(self, callback):
        self.callback = callback
        self.devices = {}
        self.pending = None
        self.last_activity = float('-inf')

    def refresh(self):
        loop = asyncio.get_running_loop()
        pattern = os.getenv('DISPLAY_INPUT_GLOB', '/dev/input/by-id/*-event-*')
        for path in glob.glob(pattern):
            if path in self.devices:
                continue
            try:
                fd = os.open(path, os.O_RDONLY | os.O_NONBLOCK)
                self.devices[path] = fd
                loop.add_reader(fd, self._read, path, fd)
            except OSError as exc:
                logger.warning('Cannot watch display input %s: %s', path, exc)

    def _read(self, path, fd):
        try:
            data = os.read(fd, self.EVENT.size * 64)
            if not data:
                raise OSError('Input device disconnected')
        except BlockingIOError:
            return
        except OSError:
            asyncio.get_running_loop().remove_reader(fd)
            os.close(fd)
            self.devices.pop(path, None)
            return
        # EV_KEY, EV_REL and EV_ABS indicate physical interaction. Ignore sync
        # and device status events. At most one activity message per second.
        activity = any(self.EVENT.unpack_from(data, pos)[2] in (1, 2, 3)
                       for pos in range(0, len(data) - self.EVENT.size + 1, self.EVENT.size))
        now = time.monotonic()
        if activity and now - self.last_activity >= 1 and (not self.pending or self.pending.done()):
            self.last_activity = now
            self.pending = asyncio.create_task(self.callback('physical-input'))

    async def close(self):
        for fd in self.devices.values():
            asyncio.get_running_loop().remove_reader(fd)
            os.close(fd)
        self.devices.clear()
        if self.pending:
            self.pending.cancel()
            await asyncio.gather(self.pending, return_exceptions=True)


class AssemblyIdle:
    def __init__(self, get_mode, set_mode, notify, busy=lambda: False,
                 display=None, clock=time.monotonic, interactive_seconds=None,
                 visualization_seconds=None):
        self.get_mode, self.set_mode, self.notify, self.busy = get_mode, set_mode, notify, busy
        self.display = display or DisplayPower()
        self.clock = clock
        self.interactive_seconds = (float(os.getenv('DISPLAY_IDLE_SECONDS', '300'))
                                    if interactive_seconds is None else interactive_seconds)
        self.visualization_seconds = (float(os.getenv('LED_AUTO_OFF_MINUTES', '15')) * 60
                                      if visualization_seconds is None else visualization_seconds)
        if self.interactive_seconds <= 0 or self.visualization_seconds <= 0:
            raise ValueError('Idle timeouts must be positive')
        self.phase = 'active'
        self.deadline = self.clock() + self.interactive_seconds
        self.restore_leds = False
        self.lock = asyncio.Lock()
        self.task = None
        self.display_retry_at = 0
        self.input = PhysicalInput(self.activity)

    def status(self):
        return {'phase': self.phase, 'remaining_seconds': max(0, int(self.deadline - self.clock())),
                'interactive_seconds': self.interactive_seconds,
                'visualization_seconds': self.visualization_seconds,
                'display_control_enabled': self.display.enabled,
                'display_error': self.display.error,
                'physical_input_devices': len(self.input.devices)}

    async def activity(self, source='browser', restore=True):
        async with self.lock:
            previous = self.phase
            if previous == 'standby':
                if not await self.display.set_awake(True):
                    return
            if restore and (self.get_mode() == 'visualization' or
                            (previous == 'standby' and self.restore_leds)):
                await self.set_mode('interactive')
            self.phase = 'active'
            self.deadline = self.clock() + self.interactive_seconds
            if previous != 'active':
                logger.info('Assembly wake/activity: %s', source)
                await self.notify()

    async def manual_mode(self, mode):
        # Explicit Off remains Off on wake; only automatic standby restores LEDs.
        await self.activity('led-control', restore=False)
        async with self.lock:
            await self.set_mode(mode)
            self.restore_leds = mode != 'off'
            self.phase = 'visualization' if mode == 'visualization' else 'active'
            duration = self.visualization_seconds if mode == 'visualization' else self.interactive_seconds
            self.deadline = self.clock() + duration

    async def tick(self):
        async with self.lock:
            if self.busy():
                self.deadline = self.clock() + (self.visualization_seconds
                                                if self.phase == 'visualization' else self.interactive_seconds)
                return
            if self.phase == 'standby' or self.clock() < self.deadline:
                return
            if self.phase == 'active':
                self.restore_leds = self.get_mode() != 'off'
                if self.restore_leds:
                    await self.set_mode('visualization')
                self.phase = 'visualization'
                self.deadline = self.clock() + self.visualization_seconds
                logger.info('Assembly idle: visualization stage')
            else:
                await self.set_mode('off')
                if await self.display.set_awake(False):
                    self.phase = 'standby'
                    logger.info('Assembly idle: grid off, display standby')
                else:
                    self.deadline = self.clock() + 10  # Retry when desktop session becomes available.
            await self.notify()

    async def start(self):
        await self.display.set_awake(True)
        self.task = asyncio.create_task(self._run())

    async def _run(self):
        while True:
            try:
                if self.display.enabled:
                    self.input.refresh()
                    # The system service can start before the desktop's Wayland
                    # socket exists. Retry startup wake without resetting idle.
                    if (self.phase == 'active' and self.display.error and
                            self.clock() >= self.display_retry_at):
                        self.display_retry_at = self.clock() + 10
                        await self.display.set_awake(True)
                await self.tick()
            except Exception:
                logger.exception('Assembly idle update failed')
            await asyncio.sleep(1)

    async def close(self):
        if self.task:
            self.task.cancel()
            await asyncio.gather(self.task, return_exceptions=True)
        await self.input.close()
        await self.display.set_awake(True)
