# NFC Collection Deployment Guide

## Overview

This guide covers deploying the NFC Collection app to a Raspberry Pi, including:
- Automated deployment from development machine
- Systemd services for auto-start on boot
- Nginx configuration for better performance (optional)
- Helper scripts for management

## Initial Setup (One-time on Raspberry Pi)

1. **Clone the repository on the Pi:**
   ```bash
   git clone https://github.com/your-repo/nfc-collection.git
   cd nfc-collection
   ```

2. **Run the setup script:**
   ```bash
   ./setup-pi.sh
   ```
   This will:
   - Install system dependencies
   - Enable SPI and I2C for NFC reader
   - Install Python packages
   - Setup systemd service
   - Configure nginx
   - Create media directories

3. **Reboot to enable SPI/I2C:**
   ```bash
   sudo reboot
   ```

## Deployment Process

### Automated Deployment (Recommended)

From your development machine:

```bash
# Deploy main branch (default)
./deploy.sh

# Deploy specific branch
./deploy.sh feature-branch

# Deploy to specific Pi (override default)
PI_HOST=loganrhyne@192.168.1.100 ./deploy.sh
```

The deployment script will:
1. Build the React app locally
2. Sync build files to the Pi
3. Update code on the Pi (git pull)
4. Update Python dependencies
5. Restart the unified server

### Manual Deployment

If you prefer manual steps:

1. **On development machine:**
   ```bash
   cd dashboard-ui
   npm run build
   ```

2. **Sync build to Pi:**
   ```bash
   rsync -avz dashboard-ui/build/ loganrhyne@192.168.1.114:~/nfc-collection/dashboard-ui/build/
   ```

3. **On Raspberry Pi:**
   ```bash
   cd ~/nfc-collection
   git pull
   cd python-services
   pip3 install -r requirements.txt --upgrade
   
   # Restart unified server
   sudo systemctl restart nfc-server
   ```

## Service Management

### Using systemd (Recommended)

```bash
# Start service
sudo systemctl start nfc-server

# Stop service
sudo systemctl stop nfc-server

# Check status
sudo systemctl status nfc-server

# View logs
sudo journalctl -u nfc-server -f

# Enable auto-start on boot
sudo systemctl enable nfc-server
```

### Using helper scripts

The setup creates helper scripts in the project directory:

```bash
cd ~/nfc-collection

# Start service
sudo systemctl start nfc-server

# Stop service
sudo systemctl stop nfc-server

# Check status
sudo systemctl status nfc-server

# View logs
sudo journalctl -u nfc-server -f
```

### Manual startup (for debugging)

```bash
# Terminal 1 - Unified server (includes WebSocket, NFC, and LED)
cd ~/nfc-collection/python-services
source venv/bin/activate
python server.py

# Terminal 2 - Web server (if not using nginx)
cd ~/nfc-collection/dashboard-ui
python3 -m http.server 80 --directory build
# Or use any port: python3 -m http.server 3000 --directory build
```

## Configuration

### Python Virtual Environment

The project uses a Python virtual environment located at:
```
/home/loganrhyne/nfc-collection/python-services/venv/
```

This keeps dependencies isolated and ensures consistent package versions. The systemd service automatically uses this environment.

To manually activate the virtual environment:
```bash
cd ~/nfc-collection/python-services
source venv/bin/activate
```

### Environment Variables

Production configuration is in `python-services/.env`:
- Set `PORT=8000` for the unified server
- Set `NFC_MOCK_MODE=false` for hardware mode
- Adjust `LED_BRIGHTNESS` as needed (0.0-1.0)

### Hardware Mode Configuration

The server automatically detects hardware availability. To force mock mode for testing:

```bash
# Enable mock mode in .env
echo "NFC_MOCK_MODE=true" >> python-services/.env
```

## Nginx Configuration (Optional)

For better performance, use nginx instead of Python's http.server:

1. **The unified server runs on port 8000, nginx serves static files and proxies WebSocket**

2. **Enable nginx:**
   ```bash
   sudo systemctl enable nginx
   sudo systemctl start nginx
   ```

Benefits:
- Better static file serving performance
- Automatic WebSocket proxying
- Cache headers for assets
- Single port 80 for everything

## Troubleshooting

### Services won't start

Check logs for errors:
```bash
sudo journalctl -u nfc-server -n 50
```

### Permission issues

Ensure loganrhyne user owns the files:
```bash
sudo chown -R loganrhyne:loganrhyne /home/loganrhyne/nfc-collection
```

### LED not working

1. Verify LED wiring:
   - Data pin: GPIO 18 (default)
   - Power: 5V
   - Ground: GND

2. Check hardware libraries are installed:
   ```bash
   cd ~/nfc-collection/python-services
   source venv/bin/activate
   pip install adafruit-circuitpython-neopixel
   ```

3. Test with manual command:
   ```bash
   cd ~/nfc-collection/tests/manual
   python test_led_websocket.py
   ```

### NFC reader not detected

1. Check SPI is enabled:
   ```bash
   sudo raspi-config
   # Interface Options > SPI > Enable
   ```

2. Verify wiring:
   - CS pin: GPIO 25
   - SCK, MISO, MOSI: Standard SPI pins

3. The server will automatically fall back to I2C if SPI fails:
   ```bash
   sudo i2cdetect -y 1
   # Should show device at address 0x24 for I2C mode
   ```

### WebSocket connection fails

1. Verify server is running:
   ```bash
   sudo systemctl status nfc-server
   ```
2. Check firewall allows port 8000
3. Verify nginx is proxying correctly:
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

## Network Access

After deployment, access the app at:
- From Pi itself: http://localhost/
- From network: http://192.168.1.114/
- WebSocket API: http://192.168.1.114:8000/

Find Pi's IP address:
```bash
hostname -I
```

## Security Considerations

1. **Authentication**: Enable in production by setting `SERVER_AUTH_TOKEN`
2. **CORS**: Limit origins to specific hosts in production
3. **Firewall**: Consider limiting access to specific IPs
4. **HTTPS**: Use a reverse proxy with SSL for internet exposure

## Performance Optimization

1. **Use nginx** for static file serving
2. **Enable gzip** compression in nginx
3. **Set appropriate cache headers** (done in nginx config)
4. **Optimize React build** with code splitting if needed
5. **Monitor memory usage** - Pi has limited RAM

## Backup and Recovery

Regular backups recommended:
```bash
# Backup journal entries and configuration
rsync -avz loganrhyne@192.168.1.114:~/nfc-collection/data/ ./backup/data/
rsync -avz loganrhyne@192.168.1.114:~/nfc-collection/python-services/.env ./backup/
```

## Updates and Maintenance

1. **Regular updates:**
   ```bash
   # From dev machine
   ./deploy.sh
   ```

2. **System updates:**
   ```bash
   sudo apt update && sudo apt upgrade
   ```

3. **Python package updates:**
   ```bash
   cd ~/nfc-collection/python-services
   source venv/bin/activate
   pip install -r requirements.txt --upgrade
   ```