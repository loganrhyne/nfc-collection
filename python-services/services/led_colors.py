#!/usr/bin/env python3
"""
Harmonious LED color configuration for NFC Collection
A balanced palette with warm and cool tones that are clearly distinct
"""

# LED-optimized colors for each sample type
# These are tuned to look good on WS2812B LEDs - PUNCHIER VERSION
LED_COLORS = {
    'Beach': {
        'hex': '#FFC800',  # Amber - strong golden yellow
        'rgb': (255, 200, 0),
        'description': 'Amber - warm golden sand'
    },
    'Desert': {
        'hex': '#FF2814',  # Coral - hotter red-orange
        'rgb': (255, 40, 20),
        'description': 'Coral - sunset desert hues'
    },
    'Lake': {
        'hex': '#00FFFF',  # Teal - electric cyan
        'rgb': (0, 255, 255),
        'description': 'Teal - pristine water'
    },
    'Mountain': {
        'hex': '#32FF64',  # Sage - vivid spring green
        'rgb': (50, 255, 100),
        'description': 'Sage - living mountain vegetation'
    },
    'River': {
        'hex': '#2846FF',  # Indigo - intense deep blue
        'rgb': (40, 70, 255),
        'description': 'Indigo - deep flowing water'
    },
    'Ruin': {
        'hex': '#DC28FF',  # Plum - bright magenta-violet
        'rgb': (220, 40, 255),
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
        Hex color string (e.g., '#FFD700')
    """
    return LED_COLORS.get(sample_type, {}).get('hex', '#FFFFFF')

# Color adjustment factors for different effects
BRIGHTNESS_LEVELS = {
    'selected': 1.0,      # Full brightness for selected item
    'filtered': 0.3,      # Dimmed for filtered but not selected
    'background': 0.1,    # Very dim for background items
    'off': 0.0           # Completely off
}

# Animation color sequences for future use
ANIMATION_SEQUENCES = {
    'rainbow': [
        (255, 0, 0),     # Red
        (255, 127, 0),   # Orange
        (255, 255, 0),   # Yellow
        (0, 255, 0),     # Green
        (0, 0, 255),     # Blue
        (75, 0, 130),    # Indigo
        (148, 0, 211)    # Violet
    ],
    'warm': [
        (255, 0, 0),     # Red
        (255, 69, 0),    # Orange-red
        (255, 140, 0),   # Dark orange
        (255, 215, 0),   # Gold
        (255, 255, 0)    # Yellow
    ],
    'cool': [
        (0, 255, 255),   # Cyan
        (0, 191, 255),   # Deep sky blue
        (0, 128, 255),   # Medium blue
        (0, 0, 255),     # Blue
        (75, 0, 130)     # Indigo
    ]
}