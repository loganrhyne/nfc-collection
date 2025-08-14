# NFC Collection System Architecture

## Overview

The NFC Collection system is a full-stack application for managing physical samples with NFC tags. It consists of:

1. **React Dashboard** - Web interface for viewing and managing journal entries
2. **Python WebSocket Server** - Backend service for NFC operations
3. **NFC Hardware Service** - Interface to PN532 NFC reader/writer

## System Components

### Frontend (React)

```
dashboard-ui/
├── src/
│   ├── components/       # React components
│   ├── context/         # React Context for state
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API and service layers
│   └── utils/           # Utility functions
```

Key Technologies:
- React 18 with Hooks
- Socket.IO Client for WebSocket
- Styled Components for styling
- React Router for navigation
- PropTypes for type checking

### Backend (Python)

```
python-services/
├── services/            # NFC hardware interface
├── server.py           # WebSocket server
└── config.py           # Configuration management
```

Key Technologies:
- Python 3.8+
- aiohttp for WebSocket server
- Socket.IO for real-time communication
- Adafruit PN532 library for NFC

## Data Flow

### 1. Tag Registration Flow

```
User Click "Register" → React Modal → WebSocket → Python Server → NFC Service → Hardware
                                                                            ↓
User Removes Tag ← Success Modal ← WebSocket ← Success Event ← Write Verification
```

### 2. Tag Scanning Flow

```
NFC Tag Detected → Hardware Thread → Parse NDEF → WebSocket Emit → React Handler → Navigate
```

## Communication Protocol

### WebSocket Events

**Client → Server:**
- `register_tag_start` - Begin tag registration
- `register_tag_cancel` - Cancel registration
- `ping` - Heartbeat

**Server → Client:**
- `connection_status` - Connection established
- `awaiting_tag` - Ready for tag placement
- `tag_write_progress` - Write progress update
- `tag_registered` - Registration complete
- `tag_scanned` - Tag detected and read
- `error` - Error occurred
- `pong` - Heartbeat response

### Data Format

NDEF payload stored on tags:
```json
{
  "v": 1,                    // Version
  "id": "uuid-string",       // Entry ID
  "geo": [lat, lon],         // Coordinates
  "ts": 1234567890          // Unix timestamp
}
```

## Security Considerations

1. **WebSocket Security**
   - Optional token-based authentication
   - Rate limiting to prevent DoS
   - CORS configuration

2. **Data Validation**
   - Input sanitization
   - NDEF size validation
   - JSON schema validation

3. **Error Handling**
   - Graceful degradation
   - User-friendly error messages
   - Comprehensive logging

## Hardware Integration

### NFC Hardware

- **Reader**: PN532 module via SPI
- **Tags**: NTAG213 (144 bytes capacity)
- **Interface**: Raspberry Pi GPIO

### Pin Configuration

- SPI: Standard Raspberry Pi SPI pins
- CS Pin: GPIO 25 (configurable)
- Power: 3.3V

## Deployment Architecture

### Development
```
[Developer Machine]
    ├── React Dev Server (port 3000)
    └── Python WebSocket (port 8765)
```

### Production
```
[Raspberry Pi]
    ├── nginx (port 80)
    │   └── React Build (static files)
    └── systemd service
        └── Python WebSocket (port 8765)
```

## Scaling Considerations

1. **Current Limitations**
   - Single WebSocket server
   - In-memory session storage
   - Local file-based data

2. **Future Scalability**
   - Redis for session storage
   - Message queue for NFC operations
   - Database for journal entries
   - Load balancing for multiple Pi units

## Monitoring and Observability

1. **Health Checks**
   - `/health` - Server health status
   - `/metrics` - Basic metrics

2. **Logging**
   - Structured JSON logging
   - Configurable log levels
   - Error tracking integration ready

3. **Performance**
   - WebSocket latency monitoring
   - NFC operation timing
   - React component profiling