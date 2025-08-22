#!/bin/bash
# Quick script to update just the SPA server

set -e

PI_HOST="loganrhyne@192.168.1.114"
PI_APP_DIR="/home/loganrhyne/nfc-collection"

echo "Updating SPA server on Raspberry Pi..."

# Copy the SPA server
scp deployment/serve-spa.py $PI_HOST:$PI_APP_DIR/deployment/

# Copy the updated service file
scp deployment/systemd/nfc-dashboard.service $PI_HOST:$PI_APP_DIR/deployment/systemd/

# Restart the service
ssh $PI_HOST << 'EOF'
    set -e
    cd /home/loganrhyne/nfc-collection
    
    # Make sure the script is executable
    chmod +x deployment/serve-spa.py
    
    # Reload systemd and restart service
    sudo systemctl daemon-reload
    sudo systemctl restart nfc-dashboard
    
    # Check status
    echo ""
    echo "Service status:"
    sudo systemctl status nfc-dashboard --no-pager
    
    echo ""
    echo "Testing /debug route:"
    curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost/debug
EOF

echo ""
echo "Update complete! Try accessing http://192.168.1.114/debug"