# LED Visualization Feature

## Summary

This branch (`agent/led-visualizations`) implements a comprehensive LED visualization system for the NFC Collection art installation. The system includes automatic mode switching, brightness control, and animated data visualizations.

## Key Features Implemented

### 1. Dual LED Modes
- **Interactive Mode**: LEDs mirror the dashboard's filtered entries in real-time
- **Visualization Mode**: Animated patterns that cycle through different data representations

### 2. Automatic Mode Switching
- Automatically enters visualization mode after 5 minutes of inactivity
- Returns to interactive mode on any user interaction (filter changes, entry selection)
- Manual mode switching available through UI control

### 3. Brightness Control
- User-adjustable brightness slider (5% to 100%)
- Global brightness affects both modes
- Persists for the session

### 4. Visualization Patterns
- **Wave**: Creates flowing waves across the LED grid
- **Type Distribution**: Shows sample types as colored blocks
- **Timeline**: Visualizes collection chronology
- **Region Map**: Displays geographic distribution
- **Random Sparkle**: Aesthetic random twinkling effect

### 5. Atomic State Transitions
- Mode changes include LED data to prevent blank states
- Smooth transitions between modes
- No flickering or intermediate states

## Technical Implementation

### Frontend Components
- `LEDModePill.js`: Main UI control for LED modes and brightness
- `useLEDController.js`: Hook for LED state management
- WebSocket integration for real-time communication

### Backend Services
- `led_mode_manager.py`: Centralized mode state management
- `led_controller.py`: Hardware control and pixel management
- `led_visualizations.py`: Animation engine with multiple patterns
- `server.py`: WebSocket handlers for LED commands

### Key Design Decisions
1. **History-based Activity Tracking**: Uses React refs to track interaction history
2. **Serpentine LED Mapping**: Handles zig-zag wiring pattern (20x5 grid)
3. **Global Brightness Multiplier**: Applied to all pixel operations
4. **Atomic Mode Changes**: Single message contains both mode and LED data

## Deployment

### Requirements
- Raspberry Pi with GPIO access
- WS2812B LED strip (100 pixels)
- Python packages: `neopixel`, `board`
- User must be in `gpio` group

### Configuration
- GPIO Pin: 18 (PWM capable)
- Pixel Order: GRB
- Grid: 5 rows × 20 columns

### Deploy Command
```bash
./deploy.sh agent/led-visualizations
```

## Media Management

The branch also includes improved media file management:
- Persistent media storage at `/home/loganrhyne/nfc-media/`
- Symlink from build directory to persistent storage
- `sync-media.sh` script for incremental media updates
- Media survives deployments

## Testing

### Manual Testing Checklist
- [ ] Interactive mode shows filtered entries correctly
- [ ] Selected entry appears brighter
- [ ] Visualization mode cycles through patterns
- [ ] Automatic switch to visualization after 5 minutes
- [ ] Activity detection brings back interactive mode
- [ ] Brightness slider adjusts LED intensity
- [ ] Manual mode switching works without conflicts
- [ ] No blank LED states during transitions

## Files Modified

### Added
- `python-services/services/led_visualizations.py`
- `python-services/services/led_mode_manager.py`
- `dashboard-ui/src/components/led/LEDModePill.js`
- `scripts/sync-media.sh`
- `docs/deployment/MEDIA_MANAGEMENT.md`

### Modified
- `python-services/services/led_controller.py`
- `python-services/server.py`
- `dashboard-ui/src/hooks/useLEDController.js`
- `dashboard-ui/src/hooks/useWebSocket.js`
- `deployment/systemd/nfc-websocket.service`
- `deploy.sh`

### Removed
- Old debug/test files
- Obsolete routing fix scripts
- Unused React components

## Known Issues
None at this time. All identified issues have been resolved.

## Future Enhancements
- Additional visualization patterns
- Pattern speed control
- Custom color schemes per pattern
- Pattern scheduling/playlist
- Sound-reactive visualizations