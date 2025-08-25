#!/usr/bin/env python3
"""
Test script for new brightness levels and fade transitions
"""

import sys
import asyncio
import os

# Add parent directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
python_services_dir = os.path.join(script_dir, '..', '..', 'python-services')
sys.path.insert(0, python_services_dir)

from services.led_controller import get_led_controller

async def test_brightness_and_fades():
    """Test the new brightness levels and fade transitions"""
    controller = get_led_controller()
    
    print("=== LED Brightness & Fade Test ===")
    print("Background: 5% brightness (very dim)")
    print("Selected: 80% brightness (bright)")
    print("Fade duration: 200ms")
    print()
    
    # Test 1: Show background vs selected
    print("1. Showing background entries (5%) vs selected (80%)...")
    test_entries = [
        {"index": 30, "color": "#00FFFF", "isSelected": False},  # Cyan background
        {"index": 31, "color": "#00FFFF", "isSelected": False},  # Cyan background
        {"index": 32, "color": "#00FFFF", "isSelected": True},   # Cyan selected
        {"index": 33, "color": "#00FFFF", "isSelected": False},  # Cyan background
        {"index": 34, "color": "#00FFFF", "isSelected": False},  # Cyan background
    ]
    await controller.update_entries(test_entries)
    print("   Middle LED should be noticeably brighter")
    await asyncio.sleep(3)
    
    # Test 2: Fade transition
    print("\n2. Testing fade transition...")
    print("   Moving selection from index 32 to 34")
    test_entries[2]["isSelected"] = False  # Deselect 32
    test_entries[4]["isSelected"] = True   # Select 34
    await controller.update_entries(test_entries)
    print("   Should see smooth fade out/in")
    await asyncio.sleep(3)
    
    # Test 3: Different colors at background level
    print("\n3. Testing different colors at background level...")
    rainbow_entries = [
        {"index": 50, "color": "#FF0000", "isSelected": False},  # Red
        {"index": 51, "color": "#FFA500", "isSelected": False},  # Orange
        {"index": 52, "color": "#FFFF00", "isSelected": False},  # Yellow
        {"index": 53, "color": "#00FF00", "isSelected": False},  # Green
        {"index": 54, "color": "#0000FF", "isSelected": False},  # Blue
        {"index": 55, "color": "#FF00FF", "isSelected": True},   # Magenta (selected)
    ]
    await controller.update_entries(rainbow_entries)
    print("   Rainbow at 5% with magenta at 80%")
    await asyncio.sleep(3)
    
    # Test 4: Move selection across rainbow
    print("\n4. Testing selection movement...")
    for i in range(6):
        # Update selection
        for j, entry in enumerate(rainbow_entries):
            entry["isSelected"] = (j == i)
        
        await controller.update_entries(rainbow_entries)
        await asyncio.sleep(1)
    
    # Clear
    print("\n5. Clearing all...")
    await controller.clear_all()
    
    print("\nTest complete!")
    print("\nKey observations:")
    print("- Background LEDs should be barely visible (5%)")
    print("- Selected LED should be clearly brighter (80%)")
    print("- Transitions should fade smoothly over 200ms")
    print("- No abrupt changes when moving selection")

if __name__ == "__main__":
    asyncio.run(test_brightness_and_fades())