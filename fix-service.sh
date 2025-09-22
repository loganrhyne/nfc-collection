#!/bin/bash
# Quick fix for the service GROUP error

echo "Fixing nfc-server service..."

# Stop the service
sudo systemctl stop nfc-server

# Update the service file to remove group requirements
sudo sed -i '/^Group=/d' /etc/systemd/system/nfc-server.service
sudo sed -i '/^SupplementaryGroups=/d' /etc/systemd/system/nfc-server.service

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart nfc-server

# Wait and check
sleep 3
echo ""
echo "Service status:"
STATUS=$(sudo systemctl is-active nfc-server)
if [ "$STATUS" = "active" ]; then
    echo "✓ nfc-server is running!"
    echo ""
    echo "You can check the UI at: http://$(hostname -I | awk '{print $1}')/"
else
    echo "✗ Service status: $STATUS"
    echo ""
    echo "Checking logs:"
    sudo journalctl -u nfc-server -n 10 --no-pager
fi