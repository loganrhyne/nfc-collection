#!/bin/bash
# Simple deployment script for NFC Collection

set -e

# Configuration
PI_HOST="${PI_HOST:-loganrhyne@192.168.1.114}"
BRANCH="${1:-main}"

echo "=== NFC Collection Deployment ==="
echo "Target: $PI_HOST"
echo "Branch: $BRANCH"
echo ""

# Build React app
echo "Building React app..."
cd dashboard-ui
REACT_APP_WS_URL=http://192.168.1.114:8000 npm run build
cd ..

# Deploy to Pi
echo "Deploying to Pi..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    dashboard-ui/build/ \
    $PI_HOST:~/nfc-collection/dashboard-ui/build/

# Update and restart on Pi
echo "Updating services on Pi..."
ssh $PI_HOST << EOF
set -e
cd ~/nfc-collection

# Update code
git fetch
git checkout $BRANCH
git pull

# Install dependencies
cd python-services
source venv/bin/activate
pip install -q -r requirements.txt

# Restart service
sudo systemctl restart nfc-server
sudo systemctl restart nginx

# Check status
sleep 2
echo ""
echo "Service status:"
sudo systemctl is-active nfc-server && echo "✓ Server running" || echo "✗ Server not running"
sudo systemctl is-active nginx && echo "✓ Nginx running" || echo "✗ Nginx not running"
EOF

echo ""
echo "=== Deployment Complete ==="
echo "Dashboard: http://192.168.1.114/"