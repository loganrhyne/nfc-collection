#!/bin/bash
# Setup script to run on the Raspberry Pi
# This configures the system for running the NFC Collection app

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== NFC Collection Raspberry Pi Setup ===${NC}"

# Check if running as root for systemd setup
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Step 1: Install system dependencies
echo -e "${YELLOW}Step 1: Installing system dependencies...${NC}"
apt-get update
apt-get install -y \
    python3-pip \
    python3-venv \
    python3-dev \
    git \
    nginx \
    i2c-tools \
    python3-smbus

# Enable I2C for NFC reader
echo -e "${YELLOW}Step 2: Enabling I2C interface...${NC}"
if ! grep -q "dtparam=i2c_arm=on" /boot/config.txt; then
    echo "dtparam=i2c_arm=on" >> /boot/config.txt
    echo "I2C enabled in /boot/config.txt"
fi

# Add loganrhyne user to i2c group
usermod -a -G i2c loganrhyne

# Step 3: Install Python packages for hardware
echo -e "${YELLOW}Step 3: Installing hardware-specific Python packages...${NC}"

# Create virtual environment if it doesn't exist
if [ ! -d "/home/loganrhyne/nfc-collection/python-services/venv" ]; then
    sudo -u loganrhyne python3 -m venv /home/loganrhyne/nfc-collection/python-services/venv
fi

# Install packages in virtual environment
sudo -u loganrhyne bash -c "
    source /home/loganrhyne/nfc-collection/python-services/venv/bin/activate
    pip install --upgrade pip
    pip install \
        adafruit-circuitpython-neopixel \
        adafruit-circuitpython-pixelbuf \
        rpi-ws281x \
        adafruit-blinka
    
    # Try to install Pi5-specific neopixel support
    pip install adafruit-circuitpython-neopixel-spi || true
"

# Step 4: Setup systemd services
echo -e "${YELLOW}Step 4: Setting up systemd services...${NC}"

# Copy service files
cp /home/loganrhyne/nfc-collection/deployment/systemd/*.service /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

# Enable services
systemctl enable nfc-websocket.service
systemctl enable nfc-dashboard.service

echo -e "${GREEN}✓ Services installed and enabled${NC}"

# Step 5: Configure nginx (optional, for better performance)
echo -e "${YELLOW}Step 5: Configuring nginx (optional)...${NC}"
cat > /etc/nginx/sites-available/nfc-collection << 'EOF'
server {
    listen 80;
    server_name _;
    
    # Serve React build
    location / {
        root /home/loganrhyne/nfc-collection/dashboard-ui/build;
        try_files $uri /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Proxy WebSocket connections
    location /socket.io/ {
        proxy_pass http://localhost:8765;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API health endpoint
    location /health {
        proxy_pass http://localhost:8765/health;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/nfc-collection /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

echo -e "${YELLOW}Step 6: Creating helper scripts...${NC}"

# Create start script
cat > /home/loganrhyne/nfc-collection/start.sh << 'EOF'
#!/bin/bash
# Start all services
sudo systemctl start nfc-websocket
sudo systemctl start nfc-dashboard
# Or use nginx instead:
# sudo systemctl start nginx
echo "Services started. Check status with: ./status.sh"
EOF

# Create stop script
cat > /home/loganrhyne/nfc-collection/stop.sh << 'EOF'
#!/bin/bash
# Stop all services
sudo systemctl stop nfc-websocket
sudo systemctl stop nfc-dashboard
echo "Services stopped."
EOF

# Create status script
cat > /home/loganrhyne/nfc-collection/status.sh << 'EOF'
#!/bin/bash
# Check service status
echo "=== Service Status ==="
sudo systemctl status nfc-websocket --no-pager
echo ""
sudo systemctl status nfc-dashboard --no-pager
EOF

# Create logs script
cat > /home/loganrhyne/nfc-collection/logs.sh << 'EOF'
#!/bin/bash
# View logs
SERVICE=${1:-websocket}

if [ "$SERVICE" = "websocket" ]; then
    sudo journalctl -u nfc-websocket -f
elif [ "$SERVICE" = "dashboard" ]; then
    sudo journalctl -u nfc-dashboard -f
else
    echo "Usage: ./logs.sh [websocket|dashboard]"
fi
EOF

# Create manual run script for debugging
cat > /home/loganrhyne/nfc-collection/run-manual.sh << 'EOF'
#!/bin/bash
# Manually run the WebSocket server (for debugging)
cd /home/loganrhyne/nfc-collection/python-services
source venv/bin/activate
python server.py
EOF

# Make scripts executable
chmod +x /home/loganrhyne/nfc-collection/*.sh
chown loganrhyne:loganrhyne /home/loganrhyne/nfc-collection/*.sh

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Reboot to ensure I2C is enabled: sudo reboot"
echo "2. Start services: sudo systemctl start nfc-websocket nfc-dashboard"
echo "3. Or use nginx: sudo systemctl start nginx nfc-websocket"
echo ""
echo "Helper scripts available in /home/loganrhyne/nfc-collection/:"
echo "  ./start.sh    - Start all services"
echo "  ./stop.sh     - Stop all services"
echo "  ./status.sh   - Check service status"
echo "  ./logs.sh     - View logs (websocket or dashboard)"
echo "  ./run-manual.sh - Manually run WebSocket server (for debugging)"
echo ""
echo "Note: Python packages are installed in a virtual environment at:"
echo "  /home/loganrhyne/nfc-collection/python-services/venv/"