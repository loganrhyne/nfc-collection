# Enhanced Color Mapping System

## Overview

The NFC Collection dashboard now features an enhanced color mapping system that provides separate color palettes for UI display and LED visualization. This addresses the issue where certain colors (particularly brown for Mountain samples) appear poorly on WS2812B RGB LEDs.

## Problem Statement

The original implementation used identical hex color codes for both the web UI and LED strip. While colors like brown (#996633) look appropriate on screen for "Mountain" samples, they appear as a bland white on RGB LEDs due to the way LEDs mix colors.

## Solution

### Dual Color Palette System

We've implemented a dual-palette approach:

1. **UI Colors**: Optimized for screen display with good contrast and visual appeal
2. **LED Colors**: Adjusted for WS2812B characteristics to ensure vibrant, distinguishable colors

### Color Mappings

| Sample Type | UI Color | LED Color | Rationale |
|------------|----------|-----------|-----------|
| Beach | #E6C200 (Golden yellow) | #FFD700 (Bright gold) | More saturated for LED pop |
| Desert | #E67300 (Orange-red) | #FF4500 (Saturated orange) | Enhanced vibrancy |
| Lake | #00B3B3 (Turquoise) | #00FFFF (Cyan) | Pure cyan for LED clarity |
| Mountain | #996633 (Brown) | #FF6B35 (Burnt orange) | Orange shows better than brown |
| River | #0099FF (Blue) | #0080FF (Deep blue) | Slightly deeper for richness |

## Implementation Details

### Frontend (React)

**File**: `dashboard-ui/src/utils/colorSchemeEnhanced.js`

```javascript
const colorSchemeEnhanced = {
  'Mountain': {
    ui: '#996633',      // Brown for screen
    led: '#FF6B35',     // Burnt orange for LEDs
    description: 'Mountain earth'
  },
  // ... other types
};

export const getUIColor = (type) => colorSchemeEnhanced[type]?.ui || '#FFFFFF';
export const getLEDColor = (type) => colorSchemeEnhanced[type]?.led || '#FFFFFF';
```

**Integration**: The `useLEDController` hook uses `getLEDColor()` when sending WebSocket messages:

```javascript
const color = entry && entry.type 
  ? getLEDColor(entry.type)
  : '#FFFFFF';
```

### Backend (Python)

**File**: `python-services/services/led_colors.py`

Provides a Python-side reference for LED colors, useful for server-side visualizations:

```python
LED_COLORS = {
    'Mountain': {
        'hex': '#FF6B35',
        'rgb': (255, 107, 53),
        'description': 'Mountain earth'
    },
    # ... other types
}
```

### Debug Tools

**Route**: `/debug`

A dedicated debug page provides:
- Side-by-side color comparison
- WebSocket connection status
- LED test controls
- Quick navigation links

## Testing & Tuning

### Color Tuning Utility

**File**: `tests/manual/tune_led_colors.py`

Interactive tool for real-time LED color adjustment:
- Select sample types (1-5)
- Adjust RGB values (r/R, g/G, b/B)
- Control brightness (-/+)
- Save tuned colors (s)

### Verification Process

1. Deploy to Raspberry Pi
2. Navigate to `/debug` route
3. Compare UI and LED colors visually
4. Use tuning utility to fine-tune if needed
5. Update color values in source files

## Benefits

1. **Better Visual Distinction**: Each sample type has a unique, vibrant LED color
2. **Maintained UI Aesthetics**: Screen colors remain unchanged and appropriate
3. **Hardware Optimization**: Colors chosen specifically for WS2812B characteristics
4. **Easy Maintenance**: Centralized color definitions with clear separation

## Future Enhancements

1. **User Preferences**: Allow users to customize their LED color mappings
2. **Dynamic Brightness**: Adjust LED brightness based on ambient light
3. **Color Themes**: Multiple preset themes for different environments
4. **Animation Colors**: Separate colors for animation sequences

## Migration Notes

The system maintains backward compatibility:
- Existing components using `colorScheme` continue to work
- The default export provides UI colors as before
- LED-specific code explicitly uses `getLEDColor()`

No changes required for components that only display UI colors.