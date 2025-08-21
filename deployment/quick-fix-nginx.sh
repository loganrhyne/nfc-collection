#!/bin/bash
# Quick fix to switch from nginx to nfc-dashboard

echo "Stopping nginx and switching to nfc-dashboard service..."

# Stop and disable nginx
sudo systemctl stop nginx
sudo systemctl disable nginx

# Make sure nfc-dashboard service is stopped first
sudo systemctl stop nfc-dashboard

# Give it a moment
sleep 2

# Start nfc-dashboard service
sudo systemctl start nfc-dashboard
sudo systemctl enable nfc-dashboard

# Check if it started successfully
if systemctl is-active --quiet nfc-dashboard; then
    echo "✓ nfc-dashboard service started successfully"
    echo ""
    echo "Service is now serving from:"
    grep "WorkingDirectory\|--directory" /etc/systemd/system/nfc-dashboard.service
    echo ""
    echo "Build timestamp:"
    ls -la /home/loganrhyne/nfc-collection/dashboard-ui/build/index.html
else
    echo "✗ Failed to start nfc-dashboard"
    echo "Checking why..."
    sudo journalctl -u nfc-dashboard -n 20
fi

echo ""
echo "Current status:"
sudo netstat -tlnp | grep :80