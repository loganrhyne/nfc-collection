#!/usr/bin/env python3
"""
Test if brightness scaling is causing white LED issue
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
        pixel_order="GRB",
        brightness=1.0
    )
    
    # Clear all first
    pixels.fill((0, 0, 0))
    pixels.show()
    time.sleep(0.5)
    
    # Test Beach color at different brightness levels
    beach_rgb = (244, 164, 96)  # Sandy Brown
    
    print("Testing Beach (Sandy Brown) color at different brightness levels")
    print(f"Original RGB: {beach_rgb}")
    print("-" * 50)
    
    brightness_levels = [1.0, 0.8, 0.5, 0.2, 0.05]
    
    for i, brightness in enumerate(brightness_levels):
        # Apply brightness
        rgb_scaled = tuple(int(c * brightness) for c in beach_rgb)
        
        print(f"\nBrightness {brightness:.2f}: RGB{beach_rgb} -> RGB{rgb_scaled}")
        
        # Set pixel
        pixels[i] = rgb_scaled
        print(f"  Set pixel {i} to {rgb_scaled}")
    
    pixels.show()
    print("\nPixels 0-4 should show Beach color at decreasing brightness")
    print("If they all appear white, there's an issue with color handling")
    time.sleep(5)
    
    # Now test with very low values to see if it's a threshold issue
    print("\n\nTesting with very low RGB values...")
    pixels.fill((0, 0, 0))
    pixels.show()
    time.sleep(0.5)
    
    # Test low brightness Beach color
    low_brightness = 0.05
    rgb_low = tuple(int(c * low_brightness) for c in beach_rgb)
    print(f"Beach at 5% brightness: {rgb_low}")
    
    # Set multiple pixels
    for i in range(10):
        pixels[i] = rgb_low
    pixels.show()
    
    print("Pixels 0-9 should show very dim Beach color")
    print("Actual values being sent:", rgb_low)
    time.sleep(5)
    
    # Clear
    pixels.fill((0, 0, 0))
    pixels.show()
    
except ImportError:
    print("NeoPixel library not available - run this on the Raspberry Pi")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()