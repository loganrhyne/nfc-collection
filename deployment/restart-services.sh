#!/bin/bash
# Service restart script to be run ON the Pi
# This script is called by deploy.sh via SSH

echo "=== Restarting NFC Collection Services ==="

# Configuration
WEBSOCKET_PORT=8000
DASHBOARD_PORT=80
MAX_ATTEMPTS=3

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Kill any existing processes
echo -e "${YELLOW}Stopping existing services...${NC}"
sudo systemctl stop nfc-websocket 2>/dev/null
sudo systemctl stop nfc-dashboard 2>/dev/null
sudo pkill -f 'python.*server.py' 2>/dev/null
sudo pkill -f 'python.*serve-spa.py' 2>/dev/null
sleep 2

# Release GPIO pins to prevent "GPIO busy" errors
echo -e "${YELLOW}Releasing GPIO pins...${NC}"
for pin in 25 8 7; do
    if [ -d "/sys/class/gpio/gpio$pin" ]; then
        echo $pin | sudo tee /sys/class/gpio/unexport > /dev/null 2>&1
    fi
done
sleep 1

# Function to start WebSocket server
start_websocket() {
    echo -e "${YELLOW}Starting WebSocket server...${NC}"

    # First try direct start (most reliable during deployment)
    echo "  Trying direct start method..."
    if [ -f /home/loganrhyne/nfc-collection/deployment/start-websocket-direct.sh ]; then
        chmod +x /home/loganrhyne/nfc-collection/deployment/start-websocket-direct.sh
        if /home/loganrhyne/nfc-collection/deployment/start-websocket-direct.sh; then
            echo -e "  ${GREEN}✓ WebSocket started directly${NC}"
            return 0
        fi
    fi

    # If direct start failed or script doesn't exist, try systemd
    echo "  Direct start failed, trying systemd..."

    # First reload systemd if service file was updated
    sudo systemctl daemon-reload 2>/dev/null

    for i in $(seq 1 $MAX_ATTEMPTS); do
        echo "  Attempt $i/$MAX_ATTEMPTS (systemd)..."
        sudo systemctl reset-failed nfc-websocket 2>/dev/null
        sudo systemctl stop nfc-websocket 2>/dev/null
        sleep 1
        sudo systemctl start nfc-websocket

        # Wait longer for service to actually start
        sleep 5

        # Check both service status AND port
        if sudo systemctl is-active --quiet nfc-websocket && sudo lsof -i:$WEBSOCKET_PORT > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓ WebSocket started via systemd${NC}"
            return 0
        fi
    done

    # Last resort: manual start with screen
    echo "  All methods failed, trying screen session..."
    cd /home/loganrhyne/nfc-collection/python-services

    # Kill any stuck processes first
    sudo pkill -f 'python.*server.py' 2>/dev/null
    sleep 2

    # Start in a screen session
    screen -dmS nfc-ws bash -c "source venv/bin/activate && python server.py 2>&1 | tee /tmp/nfc-websocket.log"
    sleep 3

    # Verify it's running
    if pgrep -f "python.*server.py" > /dev/null && sudo lsof -i:$WEBSOCKET_PORT > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ WebSocket started in screen session 'nfc-ws'${NC}"
        echo "  Attach with: screen -r nfc-ws"
        echo "  Logs: tail -f /tmp/nfc-websocket.log"
        return 0
    else
        echo -e "  ${RED}✗ Failed to start WebSocket server${NC}"
        return 1
    fi
}

# Function to start dashboard
start_dashboard() {
    echo -e "${YELLOW}Starting Dashboard server...${NC}"

    # Try systemd first
    for i in $(seq 1 $MAX_ATTEMPTS); do
        echo "  Attempt $i/$MAX_ATTEMPTS (systemd)..."
        sudo systemctl reset-failed nfc-dashboard 2>/dev/null
        sudo systemctl start nfc-dashboard
        sleep 2

        if sudo systemctl is-active --quiet nfc-dashboard; then
            echo -e "  ${GREEN}✓ Dashboard started via systemd${NC}"
            return 0
        fi
    done

    # Fallback to manual start
    echo "  Systemd failed, starting manually..."
    cd /home/loganrhyne/nfc-collection/dashboard-ui

    # Start with sudo for port 80
    sudo python3 /home/loganrhyne/nfc-collection/deployment/serve-spa.py 80 > /tmp/nfc-dashboard.log 2>&1 &
    local pid=$!
    sleep 2

    # Verify it's running
    if sudo lsof -i:$DASHBOARD_PORT > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ Dashboard started manually${NC}"
        echo "  Logs: tail -f /tmp/nfc-dashboard.log"
        return 0
    else
        echo -e "  ${RED}✗ Failed to start Dashboard server${NC}"
        return 1
    fi
}

# Start services
websocket_ok=false
dashboard_ok=false

if start_websocket; then
    websocket_ok=true
fi

if start_dashboard; then
    dashboard_ok=true
fi

# Final status report
echo ""
echo "=== Final Status ==="

# Check WebSocket
if sudo lsof -i:$WEBSOCKET_PORT > /dev/null 2>&1; then
    echo -e "${GREEN}✓ WebSocket server: RUNNING on port $WEBSOCKET_PORT${NC}"
    sudo lsof -i:$WEBSOCKET_PORT | grep LISTEN
else
    echo -e "${RED}✗ WebSocket server: NOT RUNNING${NC}"
fi

# Check Dashboard
if sudo lsof -i:$DASHBOARD_PORT > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Dashboard server: RUNNING on port $DASHBOARD_PORT${NC}"
    sudo lsof -i:$DASHBOARD_PORT | grep LISTEN
else
    echo -e "${RED}✗ Dashboard server: NOT RUNNING${NC}"
fi

# Test connectivity
echo ""
echo "Testing connectivity:"
if curl -s http://127.0.0.1:$WEBSOCKET_PORT/socket.io/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ WebSocket endpoint responding${NC}"
else
    echo -e "${RED}✗ WebSocket endpoint not responding${NC}"
fi

if curl -s http://127.0.0.1:$DASHBOARD_PORT/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Dashboard responding${NC}"
else
    echo -e "${RED}✗ Dashboard not responding${NC}"
fi

# Exit with appropriate code
if [ "$websocket_ok" = true ] && [ "$dashboard_ok" = true ]; then
    exit 0
else
    exit 1
fi