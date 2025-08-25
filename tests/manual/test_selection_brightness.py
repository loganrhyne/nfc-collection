#!/usr/bin/env python3
"""
Simple test to verify selected entry brightness
"""

import sys
import asyncio
import os

# Add parent directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
python_services_dir = os.path.join(script_dir, '..', '..', 'python-services')
sys.path.insert(0, python_services_dir)

from services.led_controller import get_led_controller

async def test_selection():
    """Test selected entry brightness directly"""
    controller = get_led_controller()
    
    print("=== Selection Brightness Test ===")
    print("Testing if selected entry shows at 80% brightness")
    print()
    
    # Clear first
    await controller.clear_all()
    await asyncio.sleep(1)
    
    # Test 1: Single selected entry
    print("1. Setting ONLY selected entry (index 75, cyan)...")
    await controller.update_entries([
        {"index": 75, "color": "#00FFFF", "isSelected": True}
    ])
    print("   Should see bright cyan at center")
    await asyncio.sleep(3)
    
    # Test 2: Add background entries
    print("\n2. Adding background entries around it...")
    await controller.update_entries([
        {"index": 74, "color": "#00FFFF", "isSelected": False},
        {"index": 75, "color": "#00FFFF", "isSelected": True},   # Selected
        {"index": 76, "color": "#00FFFF", "isSelected": False},
    ])
    print("   Center should be MUCH brighter than sides")
    await asyncio.sleep(3)
    
    # Test 3: Direct brightness test
    print("\n3. Direct pixel test - bypassing update_entries...")
    await controller.clear_all()
    await asyncio.sleep(0.5)
    
    # Set three pixels directly with different brightness
    await controller.set_pixel(60, "#FF0000", brightness=0.05)   # 5% red
    await controller.set_pixel(61, "#FF0000", brightness=0.8)    # 80% red
    await controller.set_pixel(62, "#FF0000", brightness=0.05)   # 5% red
    print("   Middle red should be MUCH brighter")
    await asyncio.sleep(3)
    
    # Test 4: Move selection
    print("\n4. Testing selection movement...")
    for i in range(74, 77):
        entries = []
        for j in range(74, 77):
            entries.append({
                "index": j,
                "color": "#00FF00",  # Green
                "isSelected": j == i
            })
        await controller.update_entries(entries)
        print(f"   Selected index: {i}")
        await asyncio.sleep(1)
    
    # Clear
    await controller.clear_all()
    
    print("\nTest complete!")
    print("\nIf selected entry isn't brighter:")
    print("1. Check WebSocket server logs")
    print("2. Try the direct pixel test (step 3)")
    print("3. Check hardware connections")

if __name__ == "__main__":
    asyncio.run(test_selection())