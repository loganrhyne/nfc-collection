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
│   React App     │ <-----> │ WebSocket Server │ <-----> │   NFC Reader    │
│  (Dashboard UI) │         │    (Python)      │         │   (PN532 I2C)   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     v
                            ┌─────────────────┐
                            │   LED Grid      │
                            │ (10x15 WS2812B) │
                            └─────────────────┘
```

## Quick Start

### Development

1. **Start the Python WebSocket server:**
   ```bash
   cd python-services
   source venv/bin/activate  # If using virtual environment
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
   - WebSocket API: http://localhost:8765

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
- **Grid Mapping**: 10x15 LED grid (150 pixels) representing the collection
- **Real-time Updates**: LEDs mirror the current dashboard state
- **Color Coding**: Each sample type has a unique color
- **Interactive Modes**:
  - Selection highlighting
  - Filtered entries display (planned)
  - Data visualization patterns (planned)

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
│   │   └── led_controller.py   # LED grid control
│   ├── server.py         # WebSocket server
│   └── venv/            # Python virtual environment
│
├── deployment/           # Deployment configuration
│   ├── systemd/         # Service definitions
│   └── *.sh             # Setup and helper scripts
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
- PN532 NFC reader/writer
- WS2812B LED strip (150 pixels in 10x15 grid)
- Various NFC tags (NTAG21x series)

## Configuration

### Environment Variables

Create `.env` files for configuration:

**dashboard-ui/.env.production:**
```
REACT_APP_WS_URL=http://192.168.1.114:8765
```

**python-services/.env:**
```
SERVER_HOST=0.0.0.0
SERVER_PORT=8765
SERVER_CORS_ORIGINS=http://192.168.1.114
LED_BRIGHTNESS=0.3
```

### LED Configuration

The LED strip uses GRB byte order. Configuration in `led_controller.py`:
- Grid: 10x15 (150 pixels)
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
- Check CORS settings in `.env`
- Ensure services are running
- Verify firewall allows port 8765

**LED colors wrong:**
- Check byte order setting (should be "GRB")
- Verify wiring connections
- Test with `test_led_colors.py`

**NFC not detected:**
- Enable I2C: `sudo raspi-config` > Interface Options
- Check wiring (SDA to GPIO 2, SCL to GPIO 3)
- Run `sudo i2cdetect -y 1` (should show device at 0x24)

## Future Enhancements

- [ ] LED visualization modes (timeline, heatmaps)
- [ ] Multi-tag scanning support
- [ ] Collection statistics dashboard
- [ ] Mobile-responsive design improvements
- [ ] Offline mode with data persistence

## License

This project is proprietary and confidential.

## Acknowledgments

Created as an interactive art installation exploring the intersection of physical materials and digital storytelling.