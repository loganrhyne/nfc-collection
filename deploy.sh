#!/bin/bash
# Deployment script for NFC Collection app
# Run from development machine to deploy to Raspberry Pi

set -e  # Exit on error

# Configuration
PI_HOST="${PI_HOST:-loganrhyne@192.168.1.114}"  # Override with environment variable if needed
PI_APP_DIR="/home/loganrhyne/nfc-collection"
LOCAL_BUILD_DIR="dashboard-ui/build"
BRANCH="${1:-main}"  # Allow branch override as first argument

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== NFC Collection Deployment Script ===${NC}"
echo "Deploying to: $PI_HOST"
echo "Target directory: $PI_APP_DIR"
echo "Branch: $BRANCH"
echo ""

# Step 1: Build the React app
echo -e "${YELLOW}Step 1: Building React app...${NC}"
cd dashboard-ui
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
cd ..

# Step 2: Create deployment package
echo -e "${YELLOW}Step 2: Creating deployment package...${NC}"
DEPLOY_TEMP=$(mktemp -d)
echo "Using temp directory: $DEPLOY_TEMP"

# Copy build files
cp -r $LOCAL_BUILD_DIR $DEPLOY_TEMP/
# Copy deployment scripts
cp -r deployment/* $DEPLOY_TEMP/ 2>/dev/null || true

# Step 3: Deploy to Raspberry Pi
echo -e "${YELLOW}Step 3: Deploying to Raspberry Pi...${NC}"

# Ensure directory exists
ssh $PI_HOST "mkdir -p $PI_APP_DIR"

# Sync built files
echo "Syncing build files..."
rsync -avz --delete \
    $DEPLOY_TEMP/build/ \
    $PI_HOST:$PI_APP_DIR/dashboard-ui/build/

# Step 4: Update code on Pi
echo -e "${YELLOW}Step 4: Updating code on Raspberry Pi...${NC}"
ssh $PI_HOST << EOF
    set -e
    cd $PI_APP_DIR
    
    # Fetch latest changes
    echo "Fetching latest changes..."
    git fetch origin
    
    # Checkout and pull the branch
    echo "Checking out branch: $BRANCH"
    git checkout $BRANCH
    git pull origin $BRANCH
    
    # Update Python dependencies in virtual environment
    echo "Updating Python dependencies..."
    cd python-services
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        echo "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment and install dependencies
    source venv/bin/activate
    pip install -r requirements.txt --upgrade
    
    # Set LED controller to hardware mode
    echo "Configuring LED controller for hardware mode..."
    sed -i 's/FORCE_MOCK = True/FORCE_MOCK = False/' services/led_controller.py
    
    echo -e "${GREEN}✓ Code updated successfully${NC}"
EOF

# Step 5: Restart services
echo -e "${YELLOW}Step 5: Restarting services...${NC}"
ssh $PI_HOST << 'EOF'
    set -e
    
    # Restart systemd services if they exist
    if systemctl is-active --quiet nfc-websocket; then
        echo "Restarting nfc-websocket service..."
        sudo systemctl restart nfc-websocket
    else
        echo "Warning: nfc-websocket service not found"
    fi
    
    if systemctl is-active --quiet nfc-dashboard; then
        echo "Restarting nfc-dashboard service..."
        sudo systemctl restart nfc-dashboard
    else
        echo "Warning: nfc-dashboard service not found"
    fi
    
    # Show service status
    echo ""
    echo "Service Status:"
    sudo systemctl status nfc-websocket --no-pager || true
    sudo systemctl status nfc-dashboard --no-pager || true
EOF

# Cleanup
rm -rf $DEPLOY_TEMP

# Step 6: Verify deployment
echo -e "${YELLOW}Step 6: Verifying deployment...${NC}"
ssh $PI_HOST << 'EOF'
    echo "Checking build timestamp..."
    ls -la /home/loganrhyne/nfc-collection/dashboard-ui/build/index.html
    
    echo ""
    echo "Checking what's serving on port 80..."
    sudo netstat -tlnp | grep :80 || sudo ss -tlnp | grep :80 || echo "Nothing found on port 80"
    
    echo ""
    echo "Service status:"
    systemctl is-active nfc-dashboard && echo "nfc-dashboard: active" || echo "nfc-dashboard: inactive"
    systemctl is-active nginx && echo "nginx: active" || echo "nginx: inactive"
EOF

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo "Dashboard URL: http://192.168.1.114/"
echo "WebSocket URL: http://192.168.1.114:8765/"
echo ""
echo "To check logs on the Pi:"
echo "  WebSocket: ssh $PI_HOST 'sudo journalctl -u nfc-websocket -f'"
echo "  Dashboard: ssh $PI_HOST 'sudo journalctl -u nfc-dashboard -f'"
echo ""
echo "If you see an old version, run on the Pi:"
echo "  sudo deployment/diagnose-web-server.sh"
echo "  sudo deployment/fix-web-server.sh"