#!/usr/bin/env python3
"""
Test LED colors directly to debug white LED issue
"""

import time
import logging
logging.basicConfig(level=logging.DEBUG)

try:
    import board
    import neopixel
    
    # Initialize NeoPixel strip
    pixels = neopixel.NeoPixel(
        board.D18,
        100,
        auto_write=False,
        pixel_order="GRB",  # WS2812B typically use GRB
        brightness=1.0
    )
    
    # Clear all first
    pixels.fill((0, 0, 0))
    pixels.show()
    time.sleep(0.5)
    
    # Test specific colors
    test_colors = [
        ("Beach (Sandy Brown)", (244, 164, 96)),
        ("River (Steel Blue)", (70, 130, 180)),
        ("Mountain (Burlywood4)", (139, 115, 85)),
        ("Desert (Burlywood)", (222, 184, 135)),
        ("Lake (Cadet Blue)", (95, 158, 160)),
    ]
    
    print("Testing LED colors directly...")
    print("Each color will light up pixels 0-4 for 2 seconds")
    print("-" * 50)
    
    for name, rgb in test_colors:
        print(f"\nTesting {name}: RGB{rgb}")
        
        # Light up first 5 pixels with this color
        for i in range(5):
            pixels[i] = rgb
            print(f"  Set pixel {i} to {rgb}")
        
        pixels.show()
        print("  -> LEDs should now show this color")
        time.sleep(2)
        
        # Clear
        for i in range(5):
            pixels[i] = (0, 0, 0)
        pixels.show()
        time.sleep(0.5)
    
    print("\nColor test complete!")
    
except ImportError:
    print("NeoPixel library not available - run this on the Raspberry Pi")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()