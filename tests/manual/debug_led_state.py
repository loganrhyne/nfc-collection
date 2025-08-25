#!/usr/bin/env python3
"""
Debug script to check LED controller state
"""

import sys
import asyncio
import os

# Add parent directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
python_services_dir = os.path.join(script_dir, '..', '..', 'python-services')
sys.path.insert(0, python_services_dir)

from services.led_controller import get_led_controller

async def debug_led_state():
    """Check the current state of the LED controller"""
    controller = get_led_controller()
    
    print("=== LED Controller Debug ===")
    print()
    
    # Get status
    status = controller.get_status()
    print("Controller Status:")
    for key, value in status.items():
        print(f"  {key}: {value}")
    
    print()
    print("Testing basic operations:")
    
    # Test 1: Clear all
    print("\n1. Clearing all LEDs...")
    await controller.clear_all()
    await asyncio.sleep(1)
    
    # Test 2: Set a single pixel
    print("\n2. Setting single pixel (index 0, red)...")
    await controller.set_pixel(0, '#FF0000', brightness=1.0)
    await asyncio.sleep(1)
    
    # Test 3: Set multiple pixels
    print("\n3. Setting multiple pixels with update_entries...")
    test_entries = [
        {"index": 10, "color": "#00FF00", "isSelected": False},
        {"index": 20, "color": "#0000FF", "isSelected": False},
        {"index": 30, "color": "#FFFF00", "isSelected": True},
    ]
    await controller.update_entries(test_entries)
    print("  - Index 10: Green (30% brightness)")
    print("  - Index 20: Blue (30% brightness)")
    print("  - Index 30: Yellow (100% brightness - selected)")
    await asyncio.sleep(3)
    
    # Test 4: Clear
    print("\n4. Clearing all...")
    await controller.clear_all()
    
    print("\nDebug complete!")
    print("\nIf you didn't see any LEDs:")
    print("1. Check that the WebSocket server is running")
    print("2. Verify hardware connections")
    print("3. Check LED_MOCK_MODE in config")

if __name__ == "__main__":
    asyncio.run(debug_led_state())