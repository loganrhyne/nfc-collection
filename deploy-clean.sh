#!/bin/bash
#
# Clean Deployment Script for NFC Collection
# Uses nginx for static files and WebSocket proxy
#

set -e  # Exit on error

# Configuration
PI_HOST="${PI_HOST:-loganrhyne@192.168.1.114}"
PI_APP_DIR="/home/loganrhyne/nfc-collection"
BRANCH="${1:-main}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== NFC Collection Deployment ===${NC}"
echo "Host: $PI_HOST"
echo "Branch: $BRANCH"
echo ""

# Step 1: Build React app locally
echo -e "${YELLOW}Building React app...${NC}"
cd dashboard-ui
REACT_APP_WS_URL=http://192.168.1.114 npm run build
cd ..
echo -e "${GREEN}✓ Build complete${NC}"

# Step 2: Deploy to Raspberry Pi
echo -e "${YELLOW}Deploying to Raspberry Pi...${NC}"

# Create deployment package
DEPLOY_TEMP=$(mktemp -d)
cp -r dashboard-ui/build $DEPLOY_TEMP/

# Sync files
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'data' \
    $DEPLOY_TEMP/build/ \
    $PI_HOST:$PI_APP_DIR/dashboard-ui/build/

rm -rf $DEPLOY_TEMP
echo -e "${GREEN}✓ Files deployed${NC}"

# Step 3: Update code and install services on Pi
echo -e "${YELLOW}Updating services on Pi...${NC}"

ssh $PI_HOST << 'REMOTE_SCRIPT'
set -e

cd ~/nfc-collection

# Update code from git
echo "Pulling latest code..."
git fetch origin
git checkout main
git pull origin main

# Install Python dependencies if needed
cd python-services
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
deactivate

cd ..

# Install nginx configuration
echo "Setting up nginx..."
sudo apt-get install -y nginx > /dev/null 2>&1

# Copy nginx config
sudo cp deployment/nginx/nfc-collection.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/nfc-collection.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Install systemd services
echo "Installing systemd services..."
sudo cp deployment/systemd/nfc-hardware.service /etc/systemd/system/
sudo cp deployment/systemd/nfc-websocket.service /etc/systemd/system/
sudo systemctl daemon-reload

# Restart services
echo "Restarting services..."

# Stop everything first
sudo systemctl stop nfc-hardware nfc-websocket 2>/dev/null || true
sudo pkill -f 'python.*hardware_service' 2>/dev/null || true
sudo pkill -f 'python.*websocket_server' 2>/dev/null || true

# Release any GPIO pins
for pin in 25 8 7; do
    if [ -d "/sys/class/gpio/gpio$pin" ]; then
        echo $pin | sudo tee /sys/class/gpio/unexport > /dev/null 2>&1 || true
    fi
done

sleep 2

# Start services
sudo systemctl start nfc-hardware
sleep 2
sudo systemctl start nfc-websocket
sudo systemctl restart nginx

# Enable services to start on boot
sudo systemctl enable nfc-hardware
sudo systemctl enable nfc-websocket
sudo systemctl enable nginx

# Check status
echo ""
echo "Service Status:"
echo "==============="
sudo systemctl is-active nfc-hardware && echo "✓ Hardware service: running" || echo "✗ Hardware service: not running"
sudo systemctl is-active nfc-websocket && echo "✓ WebSocket service: running" || echo "✗ WebSocket service: not running"
sudo systemctl is-active nginx && echo "✓ Nginx: running" || echo "✗ Nginx: not running"

# Test connectivity
if curl -s http://localhost/health > /dev/null 2>&1; then
    echo "✓ Health check: responding"
else
    echo "✗ Health check: not responding"
fi

REMOTE_SCRIPT

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo "Dashboard: http://192.168.1.114/"
echo ""
echo "View logs with:"
echo "  ssh $PI_HOST 'sudo journalctl -u nfc-hardware -f'"
echo "  ssh $PI_HOST 'sudo journalctl -u nfc-websocket -f'"
echo "  ssh $PI_HOST 'sudo tail -f /var/log/nginx/nfc-collection-*.log'"