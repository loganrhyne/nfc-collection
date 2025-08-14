# Production Deployment Guide

## Prerequisites

- Raspberry Pi 4/5 with Raspbian OS
- PN532 NFC module connected via SPI
- Node.js 18+ and Python 3.8+
- nginx (optional, for reverse proxy)

## Quick Start

### 1. Clone and Build

```bash
# Clone repository
git clone https://github.com/your-repo/nfc-collection.git
cd nfc-collection

# Run build script
./scripts/build/build.sh pi
```

### 2. Transfer to Raspberry Pi

```bash
# Transfer distribution
scp dist/nfc-collection-pi-*.tar.gz pi@raspberrypi:~/

# On the Pi, extract
ssh pi@raspberrypi
tar -xzf nfc-collection-pi-*.tar.gz
cd nfc-collection-pi-*
```

### 3. Install Dependencies

```bash
# Python dependencies
cd python-services
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Install lgpio for Pi 5
pip install rpi-lgpio
```

### 4. Configure Environment

Create `.env` file:

```bash
# WebSocket Configuration
WS_HOST=0.0.0.0
WS_PORT=8765
WS_CORS_ORIGINS=http://localhost,http://raspberrypi.local
WS_AUTH_ENABLED=false
WS_RATE_LIMIT_ENABLED=true

# NFC Configuration
NFC_MOCK_MODE=false
NFC_CS_PIN=D25
NFC_SCAN_TIMEOUT=30
NFC_WRITE_COOLDOWN=10

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/nfc-collection/server.log
```

### 5. Setup Systemd Service

```bash
# Copy service file
sudo cp python-services/nfc-scanner.service /etc/systemd/system/

# Edit service file to match your paths
sudo nano /etc/systemd/system/nfc-scanner.service

# Enable and start
sudo systemctl enable nfc-scanner
sudo systemctl start nfc-scanner
```

### 6. Setup nginx (Optional)

```bash
# Install nginx
sudo apt-get install nginx

# Create site configuration
sudo nano /etc/nginx/sites-available/nfc-collection
```

nginx configuration:
```nginx
server {
    listen 80;
    server_name raspberrypi.local;
    
    # React app
    location / {
        root /home/pi/nfc-collection/dashboard-ui;
        try_files $uri /index.html;
    }
    
    # WebSocket proxy
    location /socket.io/ {
        proxy_pass http://localhost:8765;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:8765;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/nfc-collection /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Security Hardening

### 1. Enable Authentication

```bash
# Generate secure token
export WS_AUTH_TOKEN=$(openssl rand -hex 32)
echo "WS_AUTH_TOKEN=$WS_AUTH_TOKEN" >> .env
echo "WS_AUTH_ENABLED=true" >> .env
```

Update React app:
```bash
# In dashboard-ui/.env.production
REACT_APP_WS_AUTH_TOKEN=your-token-here
```

### 2. Configure Firewall

```bash
# Install ufw
sudo apt-get install ufw

# Configure rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 8765/tcp  # Only if needed externally
sudo ufw enable
```

### 3. SSL/TLS with Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com
```

### 4. Restrict CORS

Update `.env`:
```bash
WS_CORS_ORIGINS=https://your-domain.com
```

## Monitoring

### 1. Setup Logging

```bash
# Create log directory
sudo mkdir -p /var/log/nfc-collection
sudo chown pi:pi /var/log/nfc-collection

# Setup log rotation
sudo nano /etc/logrotate.d/nfc-collection
```

Logrotate config:
```
/var/log/nfc-collection/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 pi pi
}
```

### 2. Health Monitoring

```bash
# Add to crontab
crontab -e

# Add health check every 5 minutes
*/5 * * * * curl -f http://localhost:8765/health || systemctl restart nfc-scanner
```

### 3. System Monitoring

Install monitoring tools:
```bash
# Install htop for process monitoring
sudo apt-get install htop

# Install netdata for comprehensive monitoring
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

## Performance Optimization

### 1. React Build Optimization

```bash
# Optimize build
cd dashboard-ui
npm run build -- --profile

# Analyze bundle
npm install -g webpack-bundle-analyzer
webpack-bundle-analyzer build/bundle-stats.json
```

### 2. Python Optimization

```bash
# Use production WSGI server
pip install gunicorn
gunicorn server:app --worker-class aiohttp.GunicornWebWorker
```

### 3. System Optimization

```bash
# Increase file descriptors
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize network settings
sudo sysctl -w net.core.somaxconn=1024
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=1024
```

## Backup and Recovery

### 1. Automated Backups

Create backup script:
```bash
#!/bin/bash
# /home/pi/backup-nfc.sh

BACKUP_DIR="/home/pi/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup data
tar -czf "$BACKUP_DIR/nfc-data-$DATE.tar.gz" \
  /home/pi/nfc-collection/dashboard-ui/public/data/journal.json

# Keep only last 7 days
find $BACKUP_DIR -name "nfc-data-*.tar.gz" -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /home/pi/backup-nfc.sh
```

### 2. Restore Procedure

```bash
# Stop services
sudo systemctl stop nfc-scanner

# Restore data
tar -xzf /home/pi/backups/nfc-data-latest.tar.gz -C /

# Restart services
sudo systemctl start nfc-scanner
```

## Troubleshooting

### Common Issues

1. **NFC Hardware Not Found**
   ```bash
   # Check SPI enabled
   sudo raspi-config
   # Enable SPI under Interface Options
   
   # Test hardware
   cd python-services
   python debug_nfc.py
   ```

2. **WebSocket Connection Failed**
   ```bash
   # Check service status
   sudo systemctl status nfc-scanner
   
   # Check logs
   sudo journalctl -u nfc-scanner -f
   ```

3. **Permission Errors**
   ```bash
   # Add user to gpio group
   sudo usermod -a -G gpio,spi pi
   
   # Logout and login again
   ```

### Debug Mode

Enable debug logging:
```bash
echo "LOG_LEVEL=DEBUG" >> .env
sudo systemctl restart nfc-scanner
```

## Updates and Maintenance

### 1. Update Procedure

```bash
# Backup first
/home/pi/backup-nfc.sh

# Pull updates
cd /home/pi/nfc-collection
git pull

# Rebuild
./scripts/build/build.sh pi

# Restart services
sudo systemctl restart nfc-scanner
sudo systemctl restart nginx
```

### 2. Security Updates

```bash
# System updates
sudo apt-get update
sudo apt-get upgrade

# Python package updates
cd python-services
source venv/bin/activate
pip list --outdated
pip install --upgrade package-name

# Node package updates
cd dashboard-ui
npm outdated
npm update
```

## Scaling Considerations

For multiple Pi deployments:

1. **Centralized Logging**
   - Setup rsyslog to forward logs
   - Use ELK stack or similar

2. **Configuration Management**
   - Use Ansible for deployment
   - Centralized configuration server

3. **Load Balancing**
   - HAProxy for WebSocket load balancing
   - Shared Redis for session storage

4. **Monitoring**
   - Prometheus + Grafana
   - Custom dashboards for NFC metrics