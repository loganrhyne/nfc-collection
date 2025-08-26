#!/usr/bin/env python3
"""
Test script to verify ColorManager is working correctly
"""

from services.led_visualizations import ColorManager

def test_colors():
    """Test that ColorManager returns correct RGB values"""
    print("Testing ColorManager RGB values:")
    print("-" * 40)
    
    # Test all sand types
    test_types = ['Beach', 'River', 'Mountain', 'Desert', 'Lake', 'Ruin', 'Glacial', 'Volcanic', '']
    
    for sand_type in test_types:
        rgb = ColorManager.get_type_color(sand_type)
        print(f"{sand_type:12} -> RGB{rgb}")
        
        # Verify it's a valid RGB tuple
        assert isinstance(rgb, tuple), f"Expected tuple, got {type(rgb)}"
        assert len(rgb) == 3, f"Expected 3 values, got {len(rgb)}"
        for val in rgb:
            assert isinstance(val, int), f"Expected int, got {type(val)}"
            assert 0 <= val <= 255, f"Value {val} out of range"
    
    # Test unknown type
    unknown_rgb = ColorManager.get_type_color("UnknownType")
    print(f"{'UnknownType':12} -> RGB{unknown_rgb} (should be white)")
    assert unknown_rgb == (255, 255, 255), "Unknown type should return white"
    
    print("\n✓ All color tests passed!")

if __name__ == '__main__':
    test_colors()