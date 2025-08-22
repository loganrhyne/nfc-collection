#!/usr/bin/env python3
"""
Test script for the new punchier LED colors
Shows each color for 2 seconds
"""

import sys
import time
import asyncio

# Add parent directory to path
sys.path.append('../../python-services')

from services.led_controller import get_led_controller

# New punchier colors
PUNCHIER_COLORS = {
    'Beach (Amber)': {'hex': '#FFC800', 'rgb': (255, 200, 0)},
    'Desert (Coral)': {'hex': '#FF2814', 'rgb': (255, 40, 20)},
    'Lake (Teal)': {'hex': '#00FFFF', 'rgb': (0, 255, 255)},
    'Mountain (Sage)': {'hex': '#32FF64', 'rgb': (50, 255, 100)},
    'River (Indigo)': {'hex': '#2846FF', 'rgb': (40, 70, 255)},
    'Ruin (Plum)': {'hex': '#DC28FF', 'rgb': (220, 40, 255)}
}

async def test_colors():
    """Test each punchier color"""
    controller = get_led_controller()
    
    print("Testing new PUNCHIER LED colors...")
    print("Each color will display for 2 seconds\n")
    
    # Clear all LEDs first
    await controller.clear_all()
    
    # Test each color
    for name, color_data in PUNCHIER_COLORS.items():
        print(f"Showing: {name}")
        print(f"  Hex: {color_data['hex']}")
        print(f"  RGB: {color_data['rgb']}")
        
        # Show on multiple LEDs for better visibility
        # Center cluster (5x5 around center of 10x15 grid)
        center = 75  # Center of 150 LEDs
        positions = [
            center,      # Center
            center-1, center+1,  # Left/Right
            center-15, center+15,  # Up/Down
            center-16, center-14, center+14, center+16,  # Diagonals
            center-30, center+30,  # Far up/down
            center-2, center+2,    # Far left/right
        ]
        
        for pos in positions:
            if 0 <= pos < 150:  # Ensure valid position
                await controller.set_pixel(pos, color_data['hex'], brightness=1.0)
        
        # Wait 2 seconds
        await asyncio.sleep(2)
        
        # Clear before next color
        await controller.clear_all()
        await asyncio.sleep(0.5)
    
    print("\nColor test complete!")
    print("\nComparison notes:")
    print("- Beach: Stronger golden yellow (less orange)")
    print("- Desert: Much hotter red-orange")
    print("- Lake: Full electric cyan")
    print("- Mountain: Vivid spring green")
    print("- River: Deeper, more intense blue")
    print("- Ruin: Brighter magenta-violet")

if __name__ == "__main__":
    print("=== Punchier LED Color Test ===")
    print("Make sure the WebSocket server is running!")
    print()
    
    try:
        asyncio.run(test_colors())
    except KeyboardInterrupt:
        print("\nTest interrupted")
        # Clear LEDs on exit
        asyncio.run(get_led_controller().clear_all())