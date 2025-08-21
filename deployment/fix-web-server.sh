#!/bin/bash
# Script to fix web server serving old content

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Web Server Fix Script ===${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Stop all potential web servers
echo -e "${YELLOW}1. Stopping potential web servers...${NC}"

# Stop nginx if running
if systemctl is-active --quiet nginx; then
    echo "Stopping nginx..."
    systemctl stop nginx
    systemctl disable nginx
    echo "nginx stopped and disabled"
fi

# Stop Apache if running
if systemctl is-active --quiet apache2; then
    echo "Stopping apache2..."
    systemctl stop apache2
    systemctl disable apache2
    echo "apache2 stopped and disabled"
fi

# Stop old nfc-dashboard if running
if systemctl is-active --quiet nfc-dashboard; then
    echo "Stopping nfc-dashboard..."
    systemctl stop nfc-dashboard
fi

# Kill any stray Python HTTP servers
echo -e "${YELLOW}2. Killing stray Python HTTP servers...${NC}"
pkill -f "python.*http.server" || true
pkill -f "python.*SimpleHTTPServer" || true

# Update systemd service to ensure correct directory
echo -e "${YELLOW}3. Updating nfc-dashboard service...${NC}"
if [ -f /etc/systemd/system/nfc-dashboard.service ]; then
    # Check if it's pointing to the right directory
    if ! grep -q "/home/loganrhyne/nfc-collection/dashboard-ui" /etc/systemd/system/nfc-dashboard.service; then
        echo "Service file has wrong path, updating..."
        cp /home/loganrhyne/nfc-collection/deployment/systemd/nfc-dashboard.service /etc/systemd/system/
    fi
fi

# Reload systemd
systemctl daemon-reload

# Verify the build directory
echo -e "${YELLOW}4. Verifying build directory...${NC}"
BUILD_DIR="/home/loganrhyne/nfc-collection/dashboard-ui/build"

if [ -d "$BUILD_DIR" ]; then
    echo -e "${GREEN}Build directory exists${NC}"
    echo "Build directory contents:"
    ls -la "$BUILD_DIR/index.html" 2>/dev/null || echo "No index.html found!"
    
    # Check if it's recent
    if [ -f "$BUILD_DIR/static/js/main"*.js ]; then
        echo "Latest JS file:"
        ls -lt "$BUILD_DIR/static/js/main"*.js | head -1
    fi
else
    echo -e "${RED}Build directory not found!${NC}"
    echo "You need to run the deployment script first"
    exit 1
fi

# Start the correct service
echo -e "${YELLOW}5. Starting nfc-dashboard service...${NC}"
systemctl start nfc-dashboard
systemctl enable nfc-dashboard

# Give it a moment to start
sleep 2

# Check status
if systemctl is-active --quiet nfc-dashboard; then
    echo -e "${GREEN}nfc-dashboard started successfully${NC}"
    systemctl status nfc-dashboard --no-pager | head -10
else
    echo -e "${RED}Failed to start nfc-dashboard${NC}"
    echo "Check logs with: journalctl -u nfc-dashboard -n 50"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Fix Complete ===${NC}"
echo "The web server should now be serving from:"
echo "  $BUILD_DIR"
echo ""
echo "Test it with:"
echo "  curl http://localhost/ | grep '<title>'"
echo ""
echo "If you're still seeing old content:"
echo "1. Clear your browser cache"
echo "2. Try incognito/private mode"
echo "3. Check if there's a proxy or CDN caching"