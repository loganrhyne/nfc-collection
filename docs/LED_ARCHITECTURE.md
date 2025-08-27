# LED Grid Architecture

## Overview

The LED visualization system provides real-time visual feedback that mirrors the digital dashboard interface. It consists of 100 WS2812B RGB LEDs arranged in a 20x5 grid, representing the sand collection samples. The system supports two modes: Interactive Mode (shows filtered entries) and Visualization Mode (animated data patterns).

## Hardware Configuration

### Physical Layout
- **Grid Size**: 5 rows × 20 columns = 100 LEDs
- **LED Type**: WS2812B (individually addressable RGB)
- **Data Pin**: GPIO 18 (PWM capable)
- **Wiring**: Serpentine (zig-zag) pattern
- **Power**: 5V external power supply (required for 100 LEDs)
- **Byte Order**: GRB (Green-Red-Blue)

### Wiring Pattern
```
Row 0: → 0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19
Row 1: ← 39  38  37  36  35  34  33  32  31  30  29  28  27  26  25  24  23  22  21  20
Row 2: → 40  41  42  43  44  45  46  47  48  49  50  51  52  53  54  55  56  57  58  59
Row 3: ← 79  78  77  76  75  74  73  72  71  70  69  68  67  66  65  64  63  62  61  60
Row 4: → 80  81  82  83  84  85  86  87  88  89  90  91  92  93  94  95  96  97  98  99
```

## Software Architecture

### Component Overview
```
React App (LEDModePill + useLEDController)
    ↓
WebSocket Message ('led_update')
    ↓
Python Server (handle_led_update)
    ↓
LED Mode Manager
    ↓
LED Controller Service
    ↓
Visualization Engine (for animations)
    ↓
Physical LEDs
```

### React Integration

**useLEDController Hook** (`dashboard-ui/src/hooks/useLEDController.js`)
- Monitors filtered entries and selection from DataContext
- Maps entries to consistent grid indices by creation date
- Sends LED data for interactive mode
- Brightness differentiation (5% filtered, 80% selected)

**LEDModePill Component** (`dashboard-ui/src/components/led/LEDModePill.js`)
- UI control for LED modes (Interactive/Visualization)
- Automatic mode switching after 5 minutes of inactivity
- Activity detection on filter/selection changes
- Atomic mode changes with LED data included

**LEDController Component** (`dashboard-ui/src/components/led/LEDController.js`)
- Minimal component that initializes the hook
- Clears LEDs on unmount
- No UI rendering

### Python Implementation

**LED Mode Manager** (`python-services/services/led_mode_manager.py`)
- Centralized state management for LED modes
- Coordinates transitions between Interactive and Visualization modes
- Manages visualization lifecycle
- Ensures frontend/backend sync

**LED Controller Service** (`python-services/services/led_controller.py`)
- Hardware abstraction layer
- Serpentine grid coordinate mapping
- Mode-aware LED updates
- Separate tracking for interactive vs visualization

**Visualization Engine** (`python-services/services/led_visualizations.py`)
- Animated data visualizations
- Type Distribution visualization (implemented)
- Smooth brightness ramping
- Frame-based animation system

**WebSocket Handler** (`python-services/server.py`)
- Processes `led_update` messages
- Commands: `update_interactive`, `clear_all`, `set_mode`
- Atomic mode changes with immediate LED updates

## Communication Protocol

### WebSocket Messages

**Mode Change with LED Data (Interactive):**
```json
{
  "command": "set_mode",
  "mode": "interactive",
  "allEntries": [...],
  "interactiveLedData": [
    {"index": 0, "color": "#FFC800", "type": "Beach", "isSelected": false},
    {"index": 5, "color": "#2846FF", "type": "River", "isSelected": true}
  ]
}
```

**LED Update (Interactive Mode):**
```json
{
  "command": "update_interactive",
  "entries": [
    {"index": 0, "color": "#FFC800", "type": "Beach", "isSelected": false},
    {"index": 5, "color": "#2846FF", "type": "River", "isSelected": true}
  ]
}
```

**Response Format:**
```json
{
  "success": true,
  "status": {
    "hardware_available": true,
    "num_pixels": 100,
    "leds_on": 2,
    "selected_index": 5,
    "current_mode": "interactive",
    "has_entries": true
  }
}
```

### Commands

1. **set_mode**
   - Switch between Interactive and Visualization modes
   - Parameters: `mode` ("interactive" or "visualization"), `allEntries`, `interactiveLedData` (optional)
   - Atomic operation - mode change and LED update in one message

2. **update_interactive**
   - Updates LEDs in interactive mode
   - Parameters: `entries` (array of {index, color, type, isSelected})
   - Only affects LEDs when in interactive mode

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
- ✅ **Interactive Mode**
  - Filtered entries display with brightness differentiation
  - Selected entry: 80% brightness
  - Filtered entries: 5% brightness
  - Automatic updates when filters change
  - Supports all filter types (type, region, date range)
- ✅ **Visualization Mode**
  - Type Distribution animation (cycles through entry types)
  - Smooth brightness ramping (5% to 80%)
  - 15-second cycle duration
  - Automatic start after 5 minutes of inactivity
- ✅ **Mode Management**
  - UI pill for manual mode switching
  - Automatic mode switching based on activity
  - Atomic state transitions (no blank LED states)
  - Frontend/backend state synchronization
- ✅ Hardware/mock mode switching
- ✅ Serpentine grid mapping (20x5)
- ✅ WebSocket communication
- ✅ Automatic deployment configuration
- ✅ Color byte order detection

## Future Enhancements

### Additional Visualizations
1. **Timeline Wave**: Chronological distribution with moving wave effect
2. **Geographic Heat**: Regional density heatmap
3. **Collection Growth**: Animated timeline showing collection progress
4. **Color Waves**: Abstract color patterns for ambient effect

### Technical Improvements
- Additional visualization patterns
- Configurable inactivity timeout
- Visualization speed controls
- Crossfade transitions between modes
- Performance optimization for complex animations

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

### Debug Mode
Add `?debug=led` to the dashboard URL to:
- See the LEDDebugPanel with current LED state
- Enable 30-second inactivity timeout (instead of 5 minutes)
- View detailed LED update logs in console

### Debugging Commands
```bash
# Monitor LED-related logs
sudo journalctl -u nfc-websocket -f | grep LED

# Check LED mode transitions
sudo journalctl -u nfc-websocket -f | grep "LED:"

# View visualization engine logs
sudo journalctl -u nfc-websocket -f | grep "Visualization"
```

### Testing Mode Transitions
1. **Manual Mode Switch**: Click the LED Mode pill
2. **Inactivity Timer**: Wait 5 minutes (or 30s in debug mode)
3. **Activity Detection**: Change filters or select an entry
4. **Atomic Transitions**: Verify no blank LED states

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
- [x] Mode switching UI (LEDModePill)
- [x] Automatic mode switching (5-minute inactivity)
- [x] Type Distribution visualization
- [x] Atomic state transitions
- [ ] Additional visualization patterns
- [ ] Configurable timeouts
- [ ] Visualization speed controls
- [ ] Performance optimization for 100+ entries