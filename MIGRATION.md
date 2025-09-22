# Migration Guide: Clean Architecture Refactor

## Overview

We've refactored the NFC Collection system from a complex, tightly-coupled architecture to a clean, maintainable design using industry-standard patterns.

## Architecture Changes

### Before (Complex/Fragile)
```
┌──────────────────────────┐
│  Python WebSocket Server │
│  - Serves static files   │
│  - Handles WebSocket     │
│  - Direct GPIO access    │
│  - Multiple config files │
└──────────────────────────┘
```

### After (Clean/Robust)
```
┌─────────┐     ┌──────────────┐     ┌──────────────┐
│  Nginx  │────▶│  WebSocket   │────▶│   Hardware   │
│ (Port 80)│     │    Server    │     │   Service    │
│         │     │  (Port 8000)  │     │ (Unix Socket)│
└─────────┘     └──────────────┘     └──────────────┘
```

## Key Improvements

1. **Nginx for Static Files**: Industry-standard web server handles React app efficiently
2. **Decoupled Hardware**: Hardware service runs independently, WebSocket server stays up even if hardware fails
3. **Clean Service Management**: Simple systemd services without complex fallbacks
4. **Simplified Configuration**: Minimal .env file, no configuration drift
5. **Standard Deployment**: One clean deployment script, no manual workarounds

## Migration Steps

### On Development Machine

1. **Checkout the fix branch**:
   ```bash
   git checkout fix/nfc-scan-events
   ```

2. **Review new architecture**:
   - `deployment/nginx/nfc-collection.conf` - Nginx configuration
   - `python-services/websocket_server.py` - Simplified WebSocket server
   - `python-services/hardware_service.py` - Dedicated hardware service
   - `deploy-clean.sh` - New deployment script

### On Raspberry Pi

1. **Stop old services**:
   ```bash
   sudo systemctl stop nfc-websocket nfc-dashboard
   sudo systemctl disable nfc-websocket nfc-dashboard
   ```

2. **Run setup script** (first time only):
   ```bash
   cd ~/nfc-collection
   ./setup-pi.sh
   ```

3. **Reboot** (for permissions):
   ```bash
   sudo reboot
   ```

### Deploy New Architecture

From development machine:
```bash
./deploy-clean.sh
```

This will:
- Build React app
- Deploy files via rsync
- Install nginx configuration
- Setup new systemd services
- Start everything

## Verification

Check that services are running:
```bash
sudo systemctl status nfc-hardware
sudo systemctl status nfc-websocket
sudo systemctl status nginx
```

Test the application:
- Browse to: http://192.168.1.114/
- Check WebSocket connection in browser console
- Test NFC scanning

## Cleanup Old Files

After confirming everything works:
```bash
cd ~/nfc-collection
./cleanup-cruft.sh
```

## Troubleshooting

### Services not starting
```bash
# Check logs
sudo journalctl -u nfc-hardware -n 50
sudo journalctl -u nfc-websocket -n 50

# Check GPIO access
ls -la /dev/spidev*
ls -la /dev/i2c*
groups  # Should include gpio, spi, i2c
```

### WebSocket not connecting
```bash
# Check if server is running
curl http://localhost:8000/health

# Check nginx proxy
sudo nginx -t
sudo tail -f /var/log/nginx/nfc-collection-error.log
```

### Hardware not detected
```bash
# Run hardware service manually for debugging
cd ~/nfc-collection/python-services
source venv/bin/activate
python hardware_service.py
```

## Benefits of New Architecture

1. **Reliability**: Services fail independently, not cascading
2. **Debuggability**: Clear separation of concerns, easier to isolate issues
3. **Performance**: Nginx serves static files efficiently
4. **Maintainability**: Standard patterns, less custom code
5. **Scalability**: Could easily add load balancing, caching, etc.

## Rollback (if needed)

To rollback to old architecture:
```bash
git checkout main
./deploy.sh  # Old deployment script
```

But the new architecture is much more stable and maintainable!