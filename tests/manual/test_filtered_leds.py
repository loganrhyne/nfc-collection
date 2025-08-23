#!/usr/bin/env python3
"""
Test script for filtered entries LED visualization
Simulates different filter scenarios
"""

import sys
import time
import asyncio
import json

# Add parent directory to path
sys.path.append('../../python-services')

from services.led_controller import get_led_controller

# Test data - simulating filtered entries
TEST_SCENARIOS = [
    {
        "name": "All Beach entries",
        "entries": [
            {"index": 5, "color": "#FFC800", "type": "Beach", "isSelected": True},
            {"index": 12, "color": "#FFC800", "type": "Beach", "isSelected": False},
            {"index": 23, "color": "#FFC800", "type": "Beach", "isSelected": False},
            {"index": 45, "color": "#FFC800", "type": "Beach", "isSelected": False},
            {"index": 67, "color": "#FFC800", "type": "Beach", "isSelected": False},
        ]
    },
    {
        "name": "Mixed types - Mountain selected",
        "entries": [
            {"index": 3, "color": "#FFC800", "type": "Beach", "isSelected": False},
            {"index": 15, "color": "#FF2814", "type": "Desert", "isSelected": False},
            {"index": 28, "color": "#32FF64", "type": "Mountain", "isSelected": True},
            {"index": 42, "color": "#00FFFF", "type": "Lake", "isSelected": False},
            {"index": 56, "color": "#2846FF", "type": "River", "isSelected": False},
            {"index": 89, "color": "#DC28FF", "type": "Ruin", "isSelected": False},
        ]
    },
    {
        "name": "Dense cluster - center selected",
        "entries": [
            {"index": 70, "color": "#00FFFF", "type": "Lake", "isSelected": False},
            {"index": 71, "color": "#00FFFF", "type": "Lake", "isSelected": False},
            {"index": 72, "color": "#00FFFF", "type": "Lake", "isSelected": False},
            {"index": 73, "color": "#00FFFF", "type": "Lake", "isSelected": False},
            {"index": 74, "color": "#00FFFF", "type": "Lake", "isSelected": False},
            {"index": 75, "color": "#00FFFF", "type": "Lake", "isSelected": True},  # Center
            {"index": 76, "color": "#00FFFF", "type": "Lake", "isSelected": False},
            {"index": 77, "color": "#00FFFF", "type": "Lake", "isSelected": False},
        ]
    },
    {
        "name": "No selection - all filtered",
        "entries": [
            {"index": 10, "color": "#FF2814", "type": "Desert", "isSelected": False},
            {"index": 20, "color": "#FF2814", "type": "Desert", "isSelected": False},
            {"index": 30, "color": "#FF2814", "type": "Desert", "isSelected": False},
            {"index": 40, "color": "#FF2814", "type": "Desert", "isSelected": False},
        ]
    },
    {
        "name": "Empty filter - no entries",
        "entries": []
    }
]

async def test_scenario(scenario):
    """Test a single filter scenario"""
    controller = get_led_controller()
    
    print(f"\nTesting: {scenario['name']}")
    print(f"  Entries: {len(scenario['entries'])}")
    
    # Count selected
    selected_count = sum(1 for e in scenario['entries'] if e.get('isSelected', False))
    print(f"  Selected: {selected_count}")
    
    # Send the update
    await controller.update_entries(scenario['entries'])
    
    # Show details
    for entry in scenario['entries']:
        status = "SELECTED" if entry.get('isSelected', False) else "filtered"
        print(f"    Index {entry['index']}: {entry['type']} ({status})")
    
    # Wait to observe
    await asyncio.sleep(3)

async def main():
    """Run all test scenarios"""
    controller = get_led_controller()
    
    print("=== Filtered Entries LED Test ===")
    print("This test simulates different filter scenarios")
    print("Selected entries: Full brightness")
    print("Filtered entries: 30% brightness")
    print()
    
    for scenario in TEST_SCENARIOS:
        await test_scenario(scenario)
        
        # Clear between scenarios
        await controller.clear_all()
        await asyncio.sleep(1)
    
    print("\nTest complete!")
    print("\nKey observations:")
    print("- Selected entry should be much brighter than others")
    print("- All filtered entries should be visible but dimmer")
    print("- Different filter types show their respective colors")
    print("- Empty filters should clear all LEDs")

if __name__ == "__main__":
    print("Make sure the WebSocket server is running!")
    print("Press Ctrl+C to stop\n")
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nTest interrupted")
        # Clear LEDs on exit
        asyncio.run(get_led_controller().clear_all())