import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock
import asyncio
import os

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'python-services'))
from services.assembly_idle import AssemblyIdle, PhysicalInput


class IdleTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.now = 0
        self.mode = 'interactive'
        self.busy = False
        self.display = AsyncMock(enabled=True, error=None)
        self.display.set_awake.return_value = True
        self.notify = AsyncMock()
        async def set_mode(mode):
            self.mode = mode
        self.idle = AssemblyIdle(lambda: self.mode, set_mode, self.notify,
                                 busy=lambda: self.busy, display=self.display,
                                 clock=lambda: self.now, interactive_seconds=300,
                                 visualization_seconds=900)

    async def sleep(self):
        self.now += 300
        await self.idle.tick()
        self.assertEqual(self.mode, 'visualization')
        self.now += 900
        await self.idle.tick()
        self.assertEqual(self.mode, 'off')
        self.assertEqual(self.idle.phase, 'standby')

    async def test_five_plus_fifteen_minutes_then_nfc_wakes(self):
        await self.sleep()
        self.display.set_awake.assert_awaited_with(False)
        await self.idle.activity('nfc')
        self.display.set_awake.assert_awaited_with(True)
        self.assertEqual(self.mode, 'interactive')
        self.assertEqual(self.idle.phase, 'active')
        self.assertEqual(self.idle.deadline, 1500)

    async def test_touch_resets_visualization_and_repeated_scans_count(self):
        self.now = 300
        await self.idle.tick()
        await self.idle.activity('physical-input')
        self.assertEqual(self.mode, 'interactive')
        self.now = 599
        await self.idle.activity('nfc')
        self.now = 898
        await self.idle.activity('nfc')
        await self.idle.tick()
        self.assertEqual(self.mode, 'interactive')
        self.assertEqual(self.idle.deadline, 1198)

    async def test_manual_off_survives_touch_wake(self):
        await self.idle.manual_mode('off')
        self.now = 300
        await self.idle.tick()
        self.assertEqual(self.mode, 'off')
        self.now = 1200
        await self.idle.tick()
        await self.idle.activity('physical-input')
        self.assertEqual(self.mode, 'off')
        self.assertEqual(self.idle.phase, 'active')

    async def test_manual_visualization_gets_fifteen_minutes(self):
        await self.idle.manual_mode('visualization')
        self.assertEqual(self.idle.deadline, 900)
        self.now = 900
        await self.idle.tick()
        await self.idle.activity('nfc')
        self.assertEqual(self.mode, 'interactive')

    async def test_registration_prevents_standby(self):
        self.busy = True
        self.now = 5000
        await self.idle.tick()
        self.assertEqual(self.mode, 'interactive')
        self.assertEqual(self.idle.deadline, 5300)

    async def test_display_failure_is_retried_without_claiming_sleep(self):
        self.now = 300
        await self.idle.tick()
        self.now = 1200
        self.display.set_awake.return_value = False
        await self.idle.tick()
        self.assertEqual(self.idle.phase, 'visualization')
        self.display.set_awake.return_value = True
        self.now = 1210
        await self.idle.tick()
        self.assertEqual(self.idle.phase, 'standby')

    async def test_timer_owns_status_for_every_client(self):
        await self.idle.activity('browser-a')
        self.now = 50
        await self.idle.activity('browser-b')
        self.now = 349
        await self.idle.tick()
        self.assertEqual(self.mode, 'interactive')
        self.now = 350
        await self.idle.tick()
        self.assertEqual(self.mode, 'visualization')
        self.notify.assert_awaited_once()

    async def test_native_touch_wakes_without_browser_events(self):
        await self.sleep()
        reader, writer = os.pipe()
        monitor = PhysicalInput(self.idle.activity)
        monitor.devices['touch-test'] = reader
        # A Linux EV_ABS event, as emitted by the touchscreen while HDMI is off.
        os.write(writer, monitor.EVENT.pack(0, 0, 3, 0, 100))
        monitor._read('touch-test', reader)
        await monitor.pending
        self.assertEqual(self.idle.phase, 'active')
        self.assertEqual(self.mode, 'interactive')
        await monitor.close()
        os.close(writer)

    async def test_desktop_startup_race_recovers_without_resetting_idle(self):
        ready = asyncio.Event()
        calls = 0
        async def wake(awake):
            nonlocal calls
            calls += 1
            self.display.error = 'Wayland not ready' if calls == 1 else None
            if calls > 1:
                ready.set()
            return calls > 1
        self.display.set_awake.side_effect = wake
        deadline = self.idle.deadline
        try:
            await self.idle.start()
            await asyncio.wait_for(ready.wait(), 1)
            self.assertIsNone(self.display.error)
            self.assertEqual(self.idle.deadline, deadline)
        finally:
            await self.idle.close()


if __name__ == '__main__':
    unittest.main()
