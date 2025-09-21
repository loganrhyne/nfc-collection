#!/bin/bash
# Manual startup script for NFC Collection services
# Use this when systemd services fail to start

echo "============================================"
echo "NFC Collection Manual Service Starter"
echo "============================================"

# Stop any existing services or processes
echo -e "\n🛑 Stopping any existing services..."
sudo systemctl stop nfc-websocket 2>/dev/null
sudo systemctl stop nfc-dashboard 2>/dev/null
sudo pkill -f 'python.*server.py' 2>/dev/null
sudo pkill -f 'python.*serve-spa.py' 2>/dev/null
sleep 2

# Start the WebSocket server in background
echo -e "\n🚀 Starting NFC WebSocket server..."
cd ~/nfc-collection/python-services
source venv/bin/activate
nohup python server.py > /tmp/nfc-websocket.log 2>&1 &
WS_PID=$!
echo "   WebSocket server started (PID: $WS_PID)"
echo "   Logs: tail -f /tmp/nfc-websocket.log"
deactivate

# Give WebSocket server time to start
sleep 3

# Start the web server for React app
echo -e "\n🌐 Starting web server for React app..."
cd ~/nfc-collection/dashboard-ui
sudo nohup python3 ~/nfc-collection/deployment/serve-spa.py 80 > /tmp/nfc-dashboard.log 2>&1 &
WEB_PID=$!
echo "   Web server started (PID: $WEB_PID)"
echo "   Logs: tail -f /tmp/nfc-dashboard.log"

# Wait a moment for services to stabilize
sleep 2

# Check if services are running
echo -e "\n✅ Checking service status..."
if ps -p $WS_PID > /dev/null; then
    echo "   ✓ WebSocket server is running"
else
    echo "   ✗ WebSocket server failed to start"
    echo "   Check logs: tail -f /tmp/nfc-websocket.log"
fi

if sudo lsof -i:80 > /dev/null 2>&1; then
    echo "   ✓ Web server is running on port 80"
else
    echo "   ✗ Web server failed to start on port 80"
    echo "   Check logs: tail -f /tmp/nfc-dashboard.log"
fi

echo -e "\n============================================"
echo "Services started! Access the app at:"
echo "  http://192.168.1.114/"
echo ""
echo "To stop services later, run:"
echo "  sudo pkill -f 'python.*server.py'"
echo "  sudo pkill -f 'python.*serve-spa.py'"
echo ""
echo "To view logs:"
echo "  WebSocket: tail -f /tmp/nfc-websocket.log"
echo "  Dashboard: tail -f /tmp/nfc-dashboard.log"
echo "============================================"