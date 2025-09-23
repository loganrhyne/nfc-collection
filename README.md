# NFC Sand Collection

An interactive art installation that combines physical sand samples with digital storytelling through NFC technology and LED visualization.

## Overview

This project consists of:
- **Physical Installation**: A grid of sand samples from around the world, each tagged with NFC
- **Digital Dashboard**: React-based web interface for exploring the collection
- **LED Visualization**: Real-time LED grid that mirrors the digital interface
- **NFC Integration**: Python WebSocket server for NFC tag reading/writing

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   React App     │ <-----> │  Unified Server  │ <-----> │   NFC Reader    │
│  (Dashboard UI) │         │  (Python/Socket.IO)│        │  (PN532 SPI)   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     v
                            ┌─────────────────┐
                            │   LED Grid      │
                            │ (20x5 WS2812B)  │
                            └─────────────────┘
```

## Quick Start

### Development

1. **Start the unified server:**
   ```bash
   cd python-services
   source venv/bin/activate
   python server.py
   ```

2. **Start the React development server:**
   ```bash
   cd dashboard-ui
   npm install  # First time only
   npm start
   ```

3. **Access the application:**
   - Dashboard: http://localhost:3000
   - WebSocket API: http://localhost:8000

### Production Deployment

Deploy to Raspberry Pi using the automated script:
```bash
./deploy.sh
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Features

### Dashboard UI
- **Interactive Map**: Visualize sample locations with clustering
- **Filtering System**: Filter by type (Beach, Desert, Lake, Mountain, River) and region
- **Timeline View**: Chronological exploration of the collection
- **Media Support**: Photos, videos, and PDF documents for each sample
- **Touch Optimized**: Full support for touchscreen kiosk deployment

### NFC Integration
- **Tag Registration**: Write collection data to NFC tags
- **Continuous Scanning**: Automatic detection and display of tagged samples
- **WebSocket API**: Real-time communication between hardware and UI

### LED Visualization
- **Grid Mapping**: 20x5 LED grid (100 pixels) representing the collection
- **Real-time Updates**: LEDs mirror the current dashboard state
- **Color Coding**: Each sample type has a unique color
- **Interactive Modes**:
  - Selection highlighting
  - Visualization patterns with auto-rotation
  - Auto-off timer (15 minutes default)
- **Default Brightness**: 10% for comfortable viewing
- **User Safety**: Automatic shutdown after 15 minutes in visualization mode

## Project Structure

```
nfc-collection/
├── dashboard-ui/           # React frontend application
│   ├── public/
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── context/       # React context providers
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API and media services
│   │   └── utils/         # Utility functions
│   └── build/            # Production build (generated)
│
├── python-services/       # Python backend services
│   ├── services/         # Core service modules
│   │   ├── nfc_service.py      # NFC hardware interface
│   │   ├── led_controller.py   # LED grid control
│   │   ├── led_mode_manager.py # LED mode management
│   │   └── led_visualizations.py # LED patterns
│   ├── server.py         # Unified WebSocket + NFC server
│   ├── config.py        # Service configuration
│   └── venv/            # Python virtual environment
│
├── deployment/           # Deployment configuration
│   ├── systemd/         # Service definitions
│   └── nginx/           # Nginx configuration
│
├── tests/               # Test files
│   └── manual/         # Manual testing tools
│
└── docs/               # Additional documentation
```

## Technology Stack

### Frontend
- React 18 with Hooks
- Socket.IO Client for WebSocket communication
- Recharts for data visualization
- React Leaflet for mapping
- Styled Components for styling

### Backend
- Python 3.11+ with asyncio
- python-socketio for WebSocket server
- Adafruit CircuitPython libraries for hardware control
- PN532 NFC reader via I2C interface
- WS2812B LED strip control

### Hardware
- Raspberry Pi 5
- PN532 NFC reader/writer (SPI connection, CS on GPIO 25)
- WS2812B LED strip (100 pixels in 20x5 grid)
- Various NFC tags (NTAG21x series)

## Configuration

### Environment Variables

Create `.env` files for configuration:

**dashboard-ui/.env.production:**
```
REACT_APP_WS_URL=http://192.168.1.114:8000
```

**python-services/.env:**
```
PORT=8000
NFC_MOCK_MODE=false
LED_BRIGHTNESS=0.1
LED_AUTO_OFF_MINUTES=15
```

### LED Configuration

The LED strip configuration in `led_controller.py`:
- Grid: 20x5 (100 pixels)
- Wiring: Serpentine (zig-zag)
- Data Pin: GPIO 18
- Byte Order: GRB

## Development

### Code Style
- React: Functional components with hooks
- Python: Async/await patterns, type hints
- No unnecessary comments in code
- Clear, descriptive variable names

### Testing

Manual test tools are available in `tests/manual/`:
- `test_led_websocket.py` - Test LED commands
- `test_led_ui.html` - Visual LED grid test
- `test_registration.py` - Test NFC registration

### Contributing

1. Create a feature branch
2. Make changes following existing patterns
3. Test thoroughly
4. Update documentation as needed
5. Submit pull request

## Troubleshooting

### Common Issues

**WebSocket won't connect:**
- Check if the service is running: `sudo systemctl status nfc-server`
- Ensure nginx is running: `sudo systemctl status nginx`
- Check logs: `sudo journalctl -u nfc-server -f`

**LED colors wrong:**
- Check byte order setting (should be "GRB")
- Verify wiring connections
- Test with `test_led_colors.py`

**NFC not detected:**
- Enable SPI: `sudo raspi-config` > Interface Options
- Check wiring (CS to GPIO 25)
- The server will automatically fall back to I2C if SPI fails

## Future Enhancements

- [x] LED visualization modes (interactive, visualization patterns)
- [ ] Multi-tag scanning support
- [ ] Collection statistics dashboard
- [ ] Mobile-responsive design improvements
- [ ] Offline mode with data persistence

## License

This project is proprietary and confidential.

## Acknowledgments

Created as an interactive art installation exploring the intersection of physical materials and digital storytelling.