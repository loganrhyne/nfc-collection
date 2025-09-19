#!/usr/bin/env python3
"""
Test script to verify visualization status is working correctly
Run this on the Pi to debug the visualization info issue
"""

import asyncio
import json
from services.led_controller import get_led_controller, LEDMode
from services.led_visualizations import VisualizationType
from services.led_mode_manager import LEDModeManager

async def test_visualization_status():
    print("=== Testing Visualization Status ===\n")

    # Initialize components
    led_controller = get_led_controller()
    led_mode_manager = LEDModeManager(led_controller)

    # Test data
    test_entries = [
        {
            'index': 0,
            'type': 'Beach',
            'title': 'Test Beach 1',
            'region': 'California',
            'creationDate': '2024-01-15'
        },
        {
            'index': 1,
            'type': 'Mountain',
            'title': 'Test Mountain 1',
            'region': 'Colorado',
            'creationDate': '2024-02-20'
        },
        {
            'index': 2,
            'type': 'Desert',
            'title': 'Test Desert 1',
            'region': 'Arizona',
            'creationDate': '2024-03-25'
        }
    ]

    print("1. Setting up test entries...")
    await led_mode_manager.update_entries(test_entries)

    print("2. Switching to VISUALIZATION mode...")
    status = await led_mode_manager.set_mode(LEDMode.VISUALIZATION)

    print("\n3. Status returned from set_mode:")
    print(json.dumps(status, indent=2))

    # Check if visualization info is present
    if 'visualization' in status:
        print("\n✅ Visualization info IS present in status!")
        print("Visualization details:")
        print(json.dumps(status['visualization'], indent=2))
    else:
        print("\n❌ Visualization info is MISSING from status!")
        print("Keys in status:", list(status.keys()))

    # Get status again to verify
    print("\n4. Getting status again...")
    status2 = led_mode_manager.get_status()
    print("Status from get_status:")
    print(json.dumps(status2, indent=2))

    # Check visualization engine directly
    print("\n5. Checking visualization engine directly...")
    viz_engine = led_controller.get_visualization_engine()
    viz_status = viz_engine.get_status()
    print("Direct visualization engine status:")
    print(json.dumps(viz_status, indent=2))

    # Clean up
    print("\n6. Stopping visualization...")
    await viz_engine.stop_visualization()

    print("\n=== Test Complete ===")

    # Return results
    return {
        'has_visualization_in_status': 'visualization' in status,
        'visualization_info': status.get('visualization'),
        'direct_viz_status': viz_status
    }

if __name__ == "__main__":
    result = asyncio.run(test_visualization_status())

    print("\n=== Summary ===")
    if result['has_visualization_in_status']:
        print("✅ Visualization status is working correctly!")
        print("The issue must be in the WebSocket communication or frontend.")
    else:
        print("❌ Visualization status is NOT being included!")
        print("The backend needs to be fixed.")