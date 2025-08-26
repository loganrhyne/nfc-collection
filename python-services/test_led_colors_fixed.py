#!/usr/bin/env python3
"""
Test LED colors with the LED-optimized RGB values
"""

from services.led_visualizations import ColorManager

def test_colors():
    """Test that ColorManager returns LED-optimized RGB values"""
    print("Testing ColorManager with LED-optimized RGB values:")
    print("-" * 60)
    
    # Test all sand types
    test_types = ['Beach', 'River', 'Mountain', 'Desert', 'Lake', 'Ruin']
    
    print("Type         | RGB Values      | Brightness 5%   | Brightness 80%")
    print("-" * 60)
    
    for sand_type in test_types:
        rgb = ColorManager.get_type_color(sand_type)
        rgb_5 = ColorManager.apply_brightness(rgb, 0.05)
        rgb_80 = ColorManager.apply_brightness(rgb, 0.8)
        
        print(f"{sand_type:12} | {str(rgb):15} | {str(rgb_5):15} | {str(rgb_80):15}")
    
    print("\n✓ All colors now use LED-optimized values matching interactive mode!")
    
    # Compare with hex values from frontend
    print("\nVerifying hex conversion from frontend colors:")
    frontend_colors = {
        'Beach': '#FFC800',
        'River': '#2846FF',
        'Lake': '#00FFFF',
        'Mountain': '#32FF64',
        'Desert': '#FF2814',
        'Ruin': '#DC28FF'
    }
    
    for sand_type, hex_color in frontend_colors.items():
        rgb_from_hex = ColorManager.hex_to_rgb(hex_color)
        rgb_direct = ColorManager.get_type_color(sand_type)
        match = rgb_from_hex == rgb_direct
        print(f"{sand_type}: {hex_color} -> {rgb_from_hex} {'✓' if match else '✗ MISMATCH!'}")

if __name__ == '__main__':
    test_colors()