#!/usr/bin/env python3
"""
Test script for LED auto-off timer functionality
Tests that LEDs automatically turn off after 15 minutes in visualization mode
"""

import asyncio
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../python-services'))

from services.led_controller import LEDController, LEDMode, LEDConfig
from services.led_mode_manager import LEDModeManager

async def test_auto_off_timer():
    """Test auto-off timer with shortened duration for testing"""

    print("=== LED Auto-Off Timer Test ===")
    print("This test will verify the auto-off timer functionality")
    print("")

    # Create LED controller and manager
    config = LEDConfig(mock_mode=True)  # Use mock mode for testing
    led_controller = LEDController(config)
    led_manager = LEDModeManager(led_controller)

    # Override auto-off duration to 10 seconds for testing
    led_manager._auto_off_duration = 10  # 10 seconds instead of 15 minutes

    print(f"1. Starting in OFF mode")
    print(f"   Current mode: {led_manager._current_mode.value}")
    print("")

    # Switch to visualization mode
    print(f"2. Switching to VISUALIZATION mode (with 10-second auto-off for testing)")
    await led_manager.set_mode(LEDMode.VISUALIZATION)
    print(f"   Current mode: {led_manager._current_mode.value}")
    print(f"   Auto-off timer started: {led_manager._visualization_start_time}")
    print("")

    # Check status and remaining time
    for i in range(12):
        await asyncio.sleep(1)
        remaining = led_manager.get_remaining_time()
        status = led_manager.get_status()

        if remaining is not None:
            print(f"   Time {i+1}s - Mode: {status['current_mode']}, Remaining: {remaining}s")
        else:
            print(f"   Time {i+1}s - Mode: {status['current_mode']}, Timer: inactive")

        # At 5 seconds, test user interaction (should reset timer)
        if i == 4:
            print("\n3. User interaction at 5 seconds - selecting specific visualization")
            await led_manager.select_visualization('ripple')
            print("   Timer should reset to 10 seconds")
            print("")

    # Wait a bit more to see if it stays off
    await asyncio.sleep(3)

    print("")
    print("4. Final check after auto-off should have triggered")
    final_status = led_manager.get_status()
    print(f"   Current mode: {final_status['current_mode']}")

    if final_status['current_mode'] == 'off':
        print("   ✓ Auto-off worked correctly!")
    else:
        print("   ✗ Auto-off did not trigger as expected")

    print("")
    print("=== Test Complete ===")

async def test_mode_switching():
    """Test that switching modes cancels the timer"""

    print("\n=== Mode Switching Timer Test ===")

    # Create LED controller and manager
    config = LEDConfig(mock_mode=True)
    led_controller = LEDController(config)
    led_manager = LEDModeManager(led_controller)

    # Override auto-off duration to 5 seconds for testing
    led_manager._auto_off_duration = 5

    print("1. Starting visualization mode with 5-second timer")
    await led_manager.set_mode(LEDMode.VISUALIZATION)

    await asyncio.sleep(2)
    remaining = led_manager.get_remaining_time()
    print(f"   After 2s - Remaining: {remaining}s")

    print("\n2. Switching to interactive mode (should cancel timer)")
    await led_manager.set_mode(LEDMode.INTERACTIVE)

    remaining = led_manager.get_remaining_time()
    print(f"   Timer should be cancelled: {remaining is None}")

    await asyncio.sleep(4)  # Wait past when timer would have fired

    status = led_manager.get_status()
    print(f"   Current mode after waiting: {status['current_mode']}")

    if status['current_mode'] == 'interactive':
        print("   ✓ Timer was correctly cancelled when switching modes")
    else:
        print("   ✗ Timer incorrectly fired after mode switch")

    print("\n=== Test Complete ===")

async def main():
    """Run all tests"""
    try:
        # Test 1: Basic auto-off functionality
        await test_auto_off_timer()

        # Test 2: Mode switching cancels timer
        await test_mode_switching()

        print("\n✓ All tests completed successfully")

    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())