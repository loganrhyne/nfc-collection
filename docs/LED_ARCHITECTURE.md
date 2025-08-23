# LED Grid Architecture

## Overview

The LED visualization system provides real-time visual feedback that mirrors the digital dashboard interface. It consists of 150 WS2812B RGB LEDs arranged in a 10x15 grid, representing the sand collection samples.

## Hardware Configuration

### Physical Layout
- **Grid Size**: 10 rows × 15 columns = 150 LEDs
- **LED Type**: WS2812B (individually addressable RGB)
- **Data Pin**: GPIO 18 (PWM capable)
- **Wiring**: Serpentine (zig-zag) pattern
- **Power**: 5V external power supply (required for 150 LEDs)
- **Byte Order**: GRB (Green-Red-Blue)

### Wiring Pattern
```
Row 0: → 0   1   2   3   4   5   6   7   8   9  10  11  12  13  14
Row 1: ← 29  28  27  26  25  24  23  22  21  20  19  18  17  16  15
Row 2: → 30  31  32  33  34  35  36  37  38  39  40  41  42  43  44
...
```

## Software Architecture

### Component Overview
```
React App (useLEDController hook)
    ↓
WebSocket Message ('led_update')
    ↓
Python Server (handle_led_update)
    ↓
LED Controller Service
    ↓
Hardware Abstraction (Pi5Pixelbuf)
    ↓
Physical LEDs
```

### React Integration

**useLEDController Hook** (`dashboard-ui/src/hooks/useLEDController.js`)
- Monitors `selectedEntry` from DataContext
- Maps entries to grid indices by creation date
- Sends WebSocket messages on state changes
- Handles connection status

**LEDController Component** (`dashboard-ui/src/components/led/LEDController.js`)
- Minimal component that initializes the hook
- Clears LEDs on unmount
- No UI rendering

### Python Implementation

**LED Controller Service** (`python-services/services/led_controller.py`)
- Singleton pattern for hardware access
- Grid coordinate mapping
- Color format conversion (hex to RGB)
- Brightness control
- Mock mode for development

**WebSocket Handler** (`python-services/server.py`)
- Processes `led_update` messages
- Commands: `set_selected`, `update_entries`, `clear_all`
- Returns status confirmations

## Communication Protocol

### WebSocket Messages

**Request Format:**
```json
{
  "command": "set_selected",
  "index": 42,
  "color": "#E6C200"
}
```

**Response Format:**
```json
{
  "success": true,
  "status": {
    "hardware_available": true,
    "num_pixels": 150,
    "grid_size": "10x15",
    "active_pixels": 1,
    "selected_index": 42
  }
}
```

### Commands

1. **set_selected**
   - Highlights a single entry
   - Parameters: `index` (number or null), `color` (hex string)
   - Clears previous selection automatically

2. **update_entries**
   - Updates multiple entries at once
   - Parameters: `entries` (array of {index, color, brightness})
   - Clears all LEDs before updating

3. **clear_all**
   - Turns off all LEDs
   - No parameters required

## Color Mapping

### Enhanced Color System - Harmonious Palette
The system uses separate color palettes for UI display and LED visualization:

**UI Colors** (optimized for screen):
- **Beach**: #E6B877 (Amber - warm golden sand)
- **Desert**: #E78A7E (Coral - sunset desert)  
- **Lake**: #80BFC6 (Teal - pristine water)
- **Mountain**: #A7C4A0 (Sage - mountain vegetation)
- **River**: #7A89C2 (Indigo - deep water)
- **Ruin**: #B58ABF (Plum - mysterious ancient)

**LED Colors** (optimized for WS2812B - PUNCHIER):
- **Beach**: #FFC800 (Strong golden yellow - RGB: 255, 200, 0)
- **Desert**: #FF2814 (Hotter coral red-orange - RGB: 255, 40, 20)
- **Lake**: #00FFFF (Electric cyan - RGB: 0, 255, 255)
- **Mountain**: #32FF64 (Vivid spring green - RGB: 50, 255, 100)
- **River**: #2846FF (Intense deep blue - RGB: 40, 70, 255)
- **Ruin**: #DC28FF (Bright magenta-violet - RGB: 220, 40, 255)

### Implementation
- Frontend: `utils/colorSchemeEnhanced.js` provides `getUIColor()` and `getLEDColor()`
- Backend: `services/led_colors.py` defines LED-optimized colors
- Debug: Visit `/debug` route to see color comparison panel

## Current Features

### Implemented
- ✅ Single entry selection with type-based colors
- ✅ Hardware/mock mode switching
- ✅ Serpentine grid mapping
- ✅ WebSocket communication
- ✅ Automatic deployment configuration
- ✅ Color byte order detection
- ✅ Filtered entries display with multiple brightness levels
  - Selected entry: 100% brightness
  - Filtered entries: 30% brightness
  - Automatic updates when filters change
  - Supports all filter types (type, region, date range)

## Future Enhancements

### Interaction Mode
Display current app state:
- Selected entry: Full brightness
- Filtered entries: Dimmed (30% brightness)
- Excluded entries: Off
- Hover effects: Pulse animation

### Data Visualization Mode
Automatic visualizations when idle:
1. **Timeline Heatmap**: Chronological distribution
2. **Type Distribution**: Color-coded regions
3. **Geographic Clusters**: Regional groupings
4. **Collection Growth**: Animated timeline
5. **Random Sparkle**: Attention-grabbing idle state

### Technical Improvements
- Smooth transitions between states
- Animation queuing system
- Configurable brightness profiles
- Performance optimization for rapid updates
- Error recovery and hardware fault detection

## Configuration

### Environment Variables
```bash
# python-services/.env
LED_BRIGHTNESS=0.3        # Global brightness (0.0-1.0)
LED_MOCK_MODE=false       # Override hardware detection
LED_ANIMATION_SPEED=0.5   # Animation timing multiplier
```

### Hardware Mode Toggle
The deployment script automatically sets hardware mode:
```python
FORCE_MOCK = False  # Set by deploy.sh on Pi
```

## Testing

### Manual Test Tools
1. **test_led_colors.py**: Verify byte order
2. **test_led_websocket.py**: Test WebSocket commands
3. **test_led_ui.html**: Visual grid interface
4. **test_filtered_leds.py**: Test filtered entries visualization
   - Simulates different filter scenarios
   - Verifies brightness levels (30% filtered, 100% selected)
   - Tests empty filters and dense clusters
4. **led_animation_demo.py**: Hardware test patterns

### Debugging Commands
```bash
# Test single LED
python test_led_colors.py

# Change byte order
python set_led_byteorder.py GRB

# Monitor WebSocket messages
sudo journalctl -u nfc-websocket -f | grep LED
```

## Troubleshooting

### Common Issues

**Wrong Colors**
- Check byte order (GRB for most WS2812B)
- Verify color hex values
- Test with pure R, G, B colors

**LEDs Not Responding**
- Check GPIO pin connection
- Verify 5V power supply
- Ensure common ground with Pi
- Check FORCE_MOCK setting

**Flickering/Glitches**
- Add level shifter (3.3V → 5V)
- Improve power supply
- Add capacitors near LED strip
- Reduce brightness setting

**Performance Issues**
- Batch LED updates
- Use `auto_write=False`
- Optimize coordinate calculations
- Implement update throttling

## Best Practices

1. **Power Management**
   - Use external 5V supply for LEDs
   - Calculate power requirements (60mA per LED at full white)
   - Add capacitors for stability

2. **Code Organization**
   - Keep LED logic in dedicated hook
   - Minimize WebSocket message frequency
   - Use singleton pattern for hardware access

3. **Error Handling**
   - Graceful fallback to mock mode
   - Log hardware initialization failures
   - Validate color formats

4. **Testing**
   - Test on development machine in mock mode
   - Verify on Pi before production deployment
   - Use test scripts for debugging

## Implementation Checklist

- [x] Basic hardware control
- [x] WebSocket integration
- [x] React state synchronization
- [x] Deployment automation
- [x] Color mapping by type
- [x] Enhanced UI/LED color separation
- [x] Debug tools and color comparison
- [x] Filtered entries display with brightness differentiation
- [ ] Brightness control UI
- [ ] Animation system
- [ ] Visualization modes
- [ ] Performance optimization