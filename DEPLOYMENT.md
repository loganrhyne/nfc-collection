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
   sudo deployment/setup-pi.sh
   ```
   This will:
   - Install system dependencies
   - Enable I2C for NFC reader
   - Install Python packages
   - Setup systemd services
   - Configure nginx (optional)
   - Create helper scripts

3. **Reboot to enable I2C:**
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
5. Configure LED controller for hardware mode
6. Restart services

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
   
   # Restart services
   sudo systemctl restart nfc-websocket nfc-dashboard
   ```

## Service Management

### Using systemd (Recommended)

```bash
# Start services
sudo systemctl start nfc-websocket nfc-dashboard

# Stop services
sudo systemctl stop nfc-websocket nfc-dashboard

# Check status
sudo systemctl status nfc-websocket
sudo systemctl status nfc-dashboard

# View logs
sudo journalctl -u nfc-websocket -f
sudo journalctl -u nfc-dashboard -f

# Enable auto-start on boot
sudo systemctl enable nfc-websocket nfc-dashboard
```

### Using helper scripts

The setup creates helper scripts in the project directory:

```bash
cd ~/nfc-collection

# Start all services
./start.sh

# Stop all services
./stop.sh

# Check status
./status.sh

# View logs
./logs.sh websocket  # WebSocket server logs
./logs.sh dashboard  # Dashboard server logs
```

### Manual startup (for debugging)

```bash
# Terminal 1 - WebSocket server
cd ~/nfc-collection/python-services
source venv/bin/activate
python server.py

# Or use the helper script:
cd ~/nfc-collection
./run-manual.sh

# Terminal 2 - Web server
cd ~/nfc-collection/dashboard-ui
python3 -m http.server 80 --directory build
# Or use any port: python3 -m http.server 8000 --directory build
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

Production configuration is in `python-services/.env.production`:
- Copy to `.env` for production use
- Adjust `SERVER_CORS_ORIGINS` for your network
- Set `SERVER_AUTH_TOKEN` if enabling authentication
- Adjust `LED_BRIGHTNESS` as needed

### LED Hardware Mode

The deployment script automatically sets `FORCE_MOCK = False` in the LED controller.
To manually toggle:

```bash
# Enable hardware mode (for Pi)
sed -i 's/FORCE_MOCK = True/FORCE_MOCK = False/' python-services/services/led_controller.py

# Enable mock mode (for development)
sed -i 's/FORCE_MOCK = False/FORCE_MOCK = True/' python-services/services/led_controller.py
```

## Nginx Configuration (Optional)

For better performance, use nginx instead of Python's http.server:

1. **Disable Python web server:**
   ```bash
   sudo systemctl disable nfc-dashboard
   sudo systemctl stop nfc-dashboard
   ```

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
sudo journalctl -u nfc-websocket -n 50
sudo journalctl -u nfc-dashboard -n 50
```

### Permission issues

Ensure loganrhyne user owns the files:
```bash
sudo chown -R loganrhyne:loganrhyne /home/loganrhyne/nfc-collection
```

### LED not working

1. Check I2C is enabled:
   ```bash
   sudo raspi-config
   # Interface Options > I2C > Enable
   ```

2. Verify LED wiring:
   - Data pin: GPIO 18 (default)
   - Power: 5V
   - Ground: GND

3. Check mock mode is disabled:
   ```bash
   grep FORCE_MOCK python-services/services/led_controller.py
   # Should show: FORCE_MOCK = False
   ```

### NFC reader not detected

1. Check I2C devices:
   ```bash
   sudo i2cdetect -y 1
   # Should show device at address 0x24
   ```

2. Verify wiring and PN532 mode (I2C mode)

### WebSocket connection fails

1. Check CORS origins in `.env`
2. Verify firewall allows port 8765
3. Check WebSocket server is running:
   ```bash
   sudo systemctl status nfc-websocket
   ```

## Network Access

After deployment, access the app at:
- From Pi itself: http://localhost/
- From network: http://192.168.1.114/ 
- WebSocket API: http://192.168.1.114:8765/

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