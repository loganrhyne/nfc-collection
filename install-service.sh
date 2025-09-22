#!/bin/bash
# Quick script to install the new service on Pi

echo "Installing nfc-server service..."

# Create service file with current user
cat ~/nfc-collection/deployment/systemd/nfc-server.service | sed "s/%USER%/$USER/g" | sudo tee /etc/systemd/system/nfc-server.service > /dev/null

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
echo ""
echo "Waiting for service to start..."
sleep 5

echo "Service status:"
NFC_STATUS=$(sudo systemctl is-active nfc-server)
if [ "$NFC_STATUS" = "active" ]; then
    echo "✓ nfc-server running"
else
    echo "✗ nfc-server status: $NFC_STATUS"
    echo ""
    echo "Recent logs:"
    sudo journalctl -u nfc-server -n 20 --no-pager
fi

sudo systemctl is-active nginx > /dev/null && echo "✓ nginx running" || echo "✗ nginx not running"

echo ""
echo "Done! Check http://$(hostname -I | awk '{print $1}')/"