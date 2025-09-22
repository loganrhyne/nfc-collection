#!/bin/bash
# Quick script to install the new service on Pi

echo "Installing nfc-server service..."

# Copy service file
sudo cp ~/nfc-collection/deployment/systemd/nfc-server.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Stop old services if they exist
sudo systemctl stop nfc-websocket 2>/dev/null
sudo systemctl stop nfc-hardware 2>/dev/null
sudo systemctl stop nfc-dashboard 2>/dev/null

# Disable old services
sudo systemctl disable nfc-websocket 2>/dev/null
sudo systemctl disable nfc-hardware 2>/dev/null
sudo systemctl disable nfc-dashboard 2>/dev/null

# Kill any running Python processes
sudo pkill -f 'python.*server' 2>/dev/null
sleep 2

# Enable and start new service
sudo systemctl enable nfc-server
sudo systemctl start nfc-server

# Check status
sleep 2
echo ""
echo "Service status:"
sudo systemctl is-active nfc-server && echo "✓ nfc-server running" || echo "✗ nfc-server not running"
sudo systemctl is-active nginx && echo "✓ nginx running" || echo "✗ nginx not running"

echo ""
echo "Done! Check http://192.168.1.114/"