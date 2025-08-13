# Migration Guide: Using Refactored Services

## Overview

The refactored services are now set up as the default. This guide helps you understand what's changed and how to use the new features.

## What's Changed

### 1. Configuration Management
- **NEW**: Environment-based configuration via `.env` file
- **NEW**: Config validation on startup
- **OLD**: Hardcoded values in code

### 2. Python Server (`server.py`)
- **NEW**: Health check endpoints (`/health`, `/metrics`)
- **NEW**: Rate limiting (configurable)
- **NEW**: Authentication support (optional)
- **NEW**: Structured logging
- **NEW**: Session management with cleanup
- **OLD**: Basic WebSocket server

### 3. NFC Service (`services/nfc_service.py`)
- **NEW**: Custom exception hierarchy
- **NEW**: Thread-safe hardware access
- **NEW**: Retry logic with configurable attempts
- **NEW**: Tag type detection
- **NEW**: Hardware auto-recovery
- **OLD**: Basic read/write functionality

### 4. WebSocket Hook (`useWebSocket.js`)
- **NEW**: Message queuing for offline support
- **NEW**: Heartbeat mechanism
- **NEW**: Enhanced reconnection logic
- **NEW**: Connection metrics
- **OLD**: Basic connection management

## Quick Start

### 1. Set Up Environment

```bash
cd python-services

# Copy example config
cp .env.example .env

# Edit .env with your settings
nano .env
```

Key settings to configure:
- `NFC_MOCK_MODE`: Set to `false` on Pi with hardware
- `WS_CORS_ORIGINS`: Set to your domain in production
- `WS_AUTH_ENABLED`: Enable for production

### 2. Run Services

#### Development Mode
```bash
# Use the improved startup script
./scripts/development/startup.sh
```

#### Production Mode (systemd)
```bash
# Copy updated service file
sudo cp python-services/nfc-scanner.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Restart service
sudo systemctl restart nfc-scanner
```

### 3. Monitor Services

#### Check Health
```bash
curl http://localhost:8765/health
```

#### View Metrics
```bash
curl http://localhost:8765/metrics
```

#### View Logs
```bash
# Development
# Logs appear in terminal

# Production
sudo journalctl -u nfc-scanner -f
```

## New Features

### 1. Rate Limiting
Prevents DoS attacks. Configure in `.env`:
```env
WS_RATE_LIMIT_ENABLED=true
WS_RATE_LIMIT_REQUESTS=100
WS_RATE_LIMIT_WINDOW=60
```

### 2. Authentication
Optional token-based auth:
```env
WS_AUTH_ENABLED=true
WS_AUTH_TOKEN=your-secret-token
```

React app configuration:
```javascript
// Store token in localStorage
localStorage.setItem('wsAuthToken', 'your-secret-token');
```

### 3. Message Queuing
Messages sent while disconnected are queued and sent on reconnection.

### 4. Hardware Recovery
NFC hardware automatically reinitializes after 5 consecutive errors.

## Troubleshooting

### WebSocket Won't Connect
1. Check `.env` file exists
2. Verify `WS_PORT` matches React expectations
3. Check CORS settings

### NFC Hardware Not Found
1. Set `NFC_MOCK_MODE=false` in `.env`
2. Check SPI enabled: `sudo raspi-config`
3. Verify `NFC_CS_PIN` matches your wiring

### High Memory Usage
1. Check session cleanup is working
2. Reduce `WS_MAX_MESSAGE_SIZE`
3. Enable rate limiting

## Rollback (if needed)

To use original services:
```bash
cd python-services

# Restore original files
cp server_original.py server.py
cp services/nfc_service_original.py services/nfc_service.py

# Restart
sudo systemctl restart nfc-scanner
```

## Environment Variables Reference

See `.env.example` for full list. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `WS_PORT` | 8765 | WebSocket server port |
| `WS_CORS_ORIGINS` | * | Allowed origins |
| `WS_AUTH_ENABLED` | false | Enable authentication |
| `NFC_MOCK_MODE` | false | Use mock NFC for testing |
| `LOG_LEVEL` | INFO | Logging verbosity |

## Best Practices

1. **Production Deployment**
   - Enable authentication
   - Restrict CORS origins
   - Use specific log level (INFO)
   - Enable rate limiting

2. **Development**
   - Use mock mode without hardware
   - Debug log level
   - Disable rate limiting
   - Allow all CORS origins

3. **Monitoring**
   - Check `/health` endpoint regularly
   - Monitor `/metrics` for performance
   - Set up log aggregation
   - Watch for rate limit hits

## Support

If you encounter issues:
1. Check logs first
2. Verify configuration
3. Try mock mode to isolate hardware issues
4. Check the CODE_REVIEW.md for detailed analysis