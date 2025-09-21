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

# Function to start WebSocket server
start_websocket() {
    echo -e "${YELLOW}Starting WebSocket server...${NC}"

    # Try systemd first
    for i in $(seq 1 $MAX_ATTEMPTS); do
        echo "  Attempt $i/$MAX_ATTEMPTS (systemd)..."
        sudo systemctl reset-failed nfc-websocket 2>/dev/null
        sudo systemctl start nfc-websocket
        sleep 3

        if sudo systemctl is-active --quiet nfc-websocket; then
            echo -e "  ${GREEN}✓ WebSocket started via systemd${NC}"
            return 0
        fi
    done

    # Fallback to manual start
    echo "  Systemd failed, starting manually..."
    cd /home/loganrhyne/nfc-collection/python-services

    # Start in background with proper detachment
    (
        source venv/bin/activate
        python server.py > /tmp/nfc-websocket.log 2>&1
    ) &

    local pid=$!
    sleep 3

    # Verify it's running
    if kill -0 $pid 2>/dev/null && sudo lsof -i:$WEBSOCKET_PORT > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ WebSocket started manually (PID: $pid)${NC}"
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