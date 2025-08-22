#!/usr/bin/env python3
"""
Harmonious LED color configuration for NFC Collection
Based on the third proposal with warm and cool balanced tones
"""

# LED-optimized colors for each sample type
LED_COLORS = {
    'Beach': {
        'hex': '#FFA028',  # Amber
        'rgb': (255, 160, 40),
        'description': 'Amber - warm golden sand'
    },
    'Desert': {
        'hex': '#FF5A3C',  # Coral
        'rgb': (255, 90, 60),
        'description': 'Coral - sunset desert hues'
    },
    'Lake': {
        'hex': '#00B4C8',  # Teal
        'rgb': (0, 180, 200),
        'description': 'Teal - pristine water'
    },
    'Mountain': {
        'hex': '#50C878',  # Sage
        'rgb': (80, 200, 120),
        'description': 'Sage - living mountain vegetation'
    },
    'River': {
        'hex': '#5A5AFF',  # Indigo
        'rgb': (90, 90, 255),
        'description': 'Indigo - deep flowing water'
    },
    'Ruin': {
        'hex': '#B43CDC',  # Plum
        'rgb': (180, 60, 220),
        'description': 'Plum - mysterious ancient sites'
    }
}

# UI colors for reference (what appears in the web interface)
UI_COLORS = {
    'Beach': '#E6B877',     # Amber
    'Desert': '#E78A7E',    # Coral
    'Lake': '#80BFC6',      # Teal
    'Mountain': '#A7C4A0',  # Sage
    'River': '#7A89C2',     # Indigo
    'Ruin': '#B58ABF'       # Plum
}

# Color names for reference
COLOR_NAMES = {
    'Beach': 'Amber',
    'Desert': 'Coral',
    'Lake': 'Teal',
    'Mountain': 'Sage',
    'River': 'Indigo',
    'Ruin': 'Plum'
}

def get_led_color(sample_type: str) -> tuple:
    """
    Get RGB tuple for LED display
    
    Args:
        sample_type: Type of sand sample (Beach, Desert, etc.)
        
    Returns:
        RGB tuple (r, g, b) with values 0-255
    """
    return LED_COLORS.get(sample_type, {}).get('rgb', (255, 255, 255))

def get_led_hex(sample_type: str) -> str:
    """
    Get hex color for LED display
    
    Args:
        sample_type: Type of sand sample (Beach, Desert, etc.)
        
    Returns:
        Hex color string (e.g., '#FFA028')
    """
    return LED_COLORS.get(sample_type, {}).get('hex', '#FFFFFF')

# Color characteristics for this palette
PALETTE_INFO = {
    'name': 'Harmonious',
    'description': 'Balanced warm and cool tones with nature-inspired colors',
    'advantages': [
        'Clear distinction between all 6 types',
        'Desert (Coral) and Mountain (Sage) are very different',
        'Natural color associations',
        'Good LED visibility with vibrant colors',
        'Balanced across the color spectrum'
    ]
}