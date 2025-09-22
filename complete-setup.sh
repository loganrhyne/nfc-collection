#!/bin/bash
# Complete the setup after nginx is fixed

echo "============================================"
echo "Completing NFC Collection Setup"
echo "============================================"

# Ensure we're in the right directory
cd ~/nfc-collection

echo -e "\n1. Enabling nginx to start on boot..."
sudo systemctl enable nginx

echo -e "\n2. Starting hardware and websocket services..."

# Stop any old processes
sudo pkill -f 'python.*hardware_service' 2>/dev/null || true
sudo pkill -f 'python.*websocket_server' 2>/dev/null || true
sleep 2

# Start the hardware service
echo "Starting nfc-hardware service..."
sudo systemctl daemon-reload
sudo systemctl start nfc-hardware
sleep 2

if sudo systemctl is-active --quiet nfc-hardware; then
    echo "✓ Hardware service started"
else
    echo "⚠️  Hardware service failed to start"
    echo "Check: sudo journalctl -u nfc-hardware -n 20"
fi

# Start the websocket service
echo "Starting nfc-websocket service..."
sudo systemctl start nfc-websocket
sleep 2

if sudo systemctl is-active --quiet nfc-websocket; then
    echo "✓ WebSocket service started"
else
    echo "⚠️  WebSocket service failed to start"
    echo "Check: sudo journalctl -u nfc-websocket -n 20"
fi

# Enable services to start on boot
sudo systemctl enable nfc-hardware
sudo systemctl enable nfc-websocket

echo -e "\n3. Service Status:"
echo "==================="
sudo systemctl is-active nginx && echo "✓ nginx: running" || echo "✗ nginx: not running"
sudo systemctl is-active nfc-hardware && echo "✓ nfc-hardware: running" || echo "✗ nfc-hardware: not running"
sudo systemctl is-active nfc-websocket && echo "✓ nfc-websocket: running" || echo "✗ nfc-websocket: not running"

echo -e "\n4. Testing endpoints..."
echo "======================="

# Test main page
if curl -s http://localhost/ > /dev/null 2>&1; then
    echo "✓ Main page (nginx): responding"
else
    echo "✗ Main page: not responding"
fi

# Test WebSocket health endpoint
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✓ WebSocket health: responding"
    curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || true
else
    echo "✗ WebSocket health: not responding"
fi

echo -e "\n5. Checking logs for errors..."
echo "==============================="

# Check for recent errors
if sudo journalctl -u nfc-hardware -n 5 --no-pager | grep -i error; then
    echo "⚠️  Errors in hardware service"
fi

if sudo journalctl -u nfc-websocket -n 5 --no-pager | grep -i error; then
    echo "⚠️  Errors in WebSocket service"
fi

echo -e "\n============================================"
echo "Setup Complete!"
echo "============================================"
echo ""
echo "Access the dashboard at: http://192.168.1.114/"
echo ""
echo "To view logs:"
echo "  Hardware: sudo journalctl -u nfc-hardware -f"
echo "  WebSocket: sudo journalctl -u nfc-websocket -f"
echo "  Nginx: sudo tail -f /var/log/nginx/nfc-collection-*.log"
echo ""
echo "Next step: Deploy the React app from your dev machine:"
echo "  ./deploy-clean.sh"
echo "============================================"