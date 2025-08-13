# Robust WebSocket Connection Setup

## Changes Made

1. **Enhanced WebSocket Reconnection**:
   - Set `reconnectionAttempts: Infinity` to keep trying forever
   - Increased connection timeout to 20 seconds
   - Added fallback transport from websocket to polling
   - Added connection error tracking and reconnection attempt counter
   - Updated status indicator to show reconnection attempts

2. **Startup Order Management**:
   - Created `startup.sh` script that starts services in correct order
   - Python WebSocket server starts first
   - Script waits for port 8765 to be ready before starting React
   - Provides PIDs for easy service management

3. **Systemd Service** (for automatic startup):
   - Created `python-services/nfc-scanner.service` for the Python server

## Manual Startup

Use the startup script to ensure proper order:
```bash
cd ~/nfc-collection
./startup.sh
```

## Automatic Startup with systemd

1. Copy the service file:
```bash
sudo cp ~/nfc-collection/python-services/nfc-scanner.service /etc/systemd/system/
```

2. Enable and start the service:
```bash
sudo systemctl enable nfc-scanner.service
sudo systemctl start nfc-scanner.service
```

3. Check service status:
```bash
sudo systemctl status nfc-scanner.service
journalctl -u nfc-scanner.service -f  # Follow logs
```

4. For the React app, you can either:
   - Run it manually after boot
   - Create another systemd service
   - Use pm2 for process management

## Testing Connection Robustness

1. Start only the React app first:
```bash
cd ~/nfc-collection/dashboard-ui
npm start
```

2. Watch the status indicator - it should show "Connecting to NFC Scanner..."

3. Start the Python server:
```bash
cd ~/nfc-collection/python-services
source venv/bin/activate
python server.py
```

4. The React app should automatically connect and show "NFC Scanner Connected"

## Debugging Connection Issues

1. Check if Python server is running:
```bash
ps aux | grep server.py
netstat -tuln | grep 8765
```

2. Check WebSocket URL in browser console:
```javascript
// Should show: WebSocket URL: http://[pi-ip]:8765 Environment: production
```

3. Check browser network tab for WebSocket connection attempts

4. Check Python server logs:
```bash
journalctl -u nfc-scanner.service -f
# or if running manually, check terminal output
```

## Alternative: Using PM2

For more robust process management, consider using PM2:

```bash
# Install PM2
sudo npm install -g pm2

# Start Python server with PM2
pm2 start ~/nfc-collection/python-services/server.py --name nfc-scanner --interpreter python3

# Start React app with PM2
pm2 start npm --name nfc-ui -- start --cwd ~/nfc-collection/dashboard-ui

# Save PM2 configuration
pm2 save
pm2 startup  # Follow instructions to enable startup
```

The WebSocket connection will now automatically reconnect indefinitely if the connection is lost, making the system robust to startup order and network interruptions.