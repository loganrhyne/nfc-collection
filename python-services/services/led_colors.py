#!/usr/bin/env python3
"""
LED color configuration for NFC Collection
Separate from UI colors to optimize for LED appearance
"""

# LED-optimized colors for each sample type
# These are tuned to look good on WS2812B LEDs
LED_COLORS = {
    'Beach': {
        'hex': '#FFD700',  # Bright gold
        'rgb': (255, 215, 0),
        'description': 'Golden sand'
    },
    'Desert': {
        'hex': '#FF4500',  # Orange-red
        'rgb': (255, 69, 0),
        'description': 'Desert sand'
    },
    'Lake': {
        'hex': '#00FFFF',  # Cyan
        'rgb': (0, 255, 255),
        'description': 'Lake shore'
    },
    'Mountain': {
        'hex': '#FF6B35',  # Burnt orange (instead of brown)
        'rgb': (255, 107, 53),
        'description': 'Mountain earth'
    },
    'River': {
        'hex': '#0080FF',  # Medium blue
        'rgb': (0, 128, 255),
        'description': 'River bank'
    }
}

# UI colors for reference (what appears in the web interface)
UI_COLORS = {
    'Beach': '#E6C200',     # Golden yellow
    'Desert': '#E67300',    # Orange-red
    'Lake': '#00B3B3',      # Turquoise
    'Mountain': '#996633',  # Brown
    'River': '#0099FF'      # Blue
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