#!/usr/bin/env python3
"""
Test script to debug LED color byte order
"""

import time
import sys
sys.path.append('/home/loganrhyne/nfc-collection/python-services')

from services.led_controller import get_led_controller

# Test colors with their expected appearance
test_colors = [
    ("Beach (Gold)", "#E6C200", "Should be golden yellow"),
    ("Desert (Orange)", "#E67300", "Should be orange/red"),
    ("Lake (Turquoise)", "#00B3B3", "Should be turquoise"),
    ("Mountain (Brown)", "#996633", "Should be brown"),
    ("River (Blue)", "#0099FF", "Should be blue"),
    ("Pure Red", "#FF0000", "Should be red"),
    ("Pure Green", "#00FF00", "Should be green"),
    ("Pure Blue", "#0000FF", "Should be blue"),
    ("White", "#FFFFFF", "Should be white"),
]

async def test_colors():
    controller = get_led_controller()
    
    print("LED Color Test - Current byte order:", controller._pixels.byteorder if hasattr(controller._pixels, 'byteorder') else "Unknown")
    print("\nTesting each color for 3 seconds...")
    print("Note what color you actually see!\n")
    
    for name, color, expected in test_colors:
        print(f"Testing: {name}")
        print(f"  Hex: {color}")
        print(f"  Expected: {expected}")
        
        # Light up LED 0 with this color
        await controller.set_pixel(0, color, brightness=1.0)
        
        # Wait for observation
        time.sleep(3)
        
        # Clear
        await controller.clear_all()
        time.sleep(0.5)
    
    print("\nTest complete!")
    print("\nBased on what you saw:")
    print("- If Red showed as Green and Blue showed as Red: Try 'GBR'")
    print("- If Red showed as Blue and Green showed as Red: Try 'BRG'") 
    print("- If colors were close but shifted: Try 'RGB'")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_colors())