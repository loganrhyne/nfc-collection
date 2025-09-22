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
# Set WebSocket URL to static IP for production (server.py uses port 8000)
REACT_APP_WS_URL=http://192.168.1.114:8000 npm run build
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
# Copy deployment scripts and SPA server
cp -r deployment/* $DEPLOY_TEMP/ 2>/dev/null || true
mkdir -p $DEPLOY_TEMP/deployment
cp deployment/serve-spa.py $DEPLOY_TEMP/deployment/ 2>/dev/null || true

# Step 3: Deploy to Raspberry Pi
echo -e "${YELLOW}Step 3: Deploying to Raspberry Pi...${NC}"

# Ensure directory exists
ssh $PI_HOST "mkdir -p $PI_APP_DIR"

# Sync built files (excluding data directory)
echo "Syncing build files..."
rsync -avz --delete \
    --exclude 'data' \
    $DEPLOY_TEMP/build/ \
    $PI_HOST:$PI_APP_DIR/dashboard-ui/build/

# Sync deployment files
echo "Syncing deployment files..."
rsync -avz \
    $DEPLOY_TEMP/deployment/ \
    $PI_HOST:$PI_APP_DIR/deployment/

# Step 4: Setup media symlinks
echo -e "${YELLOW}Step 4: Setting up media symlinks...${NC}"
ssh $PI_HOST << EOF
    set -e
    cd $PI_APP_DIR
    
    # Create persistent media directory if it doesn't exist
    MEDIA_DIR="/home/loganrhyne/nfc-media"
    if [ ! -d "\$MEDIA_DIR" ]; then
        echo "Creating persistent media directory: \$MEDIA_DIR"
        mkdir -p "\$MEDIA_DIR"/{photos,videos}
    fi
    
    # Remove old data directory if it exists (not a symlink)
    if [ -d "dashboard-ui/build/data" ] && [ ! -L "dashboard-ui/build/data" ]; then
        echo "Removing old data directory..."
        rm -rf dashboard-ui/build/data
    fi
    
    # Create symlink to persistent media directory
    if [ ! -L "dashboard-ui/build/data" ]; then
        echo "Creating symlink to media directory..."
        ln -s "\$MEDIA_DIR" dashboard-ui/build/data
    fi
    
    # Verify symlink
    echo "Data directory symlink:"
    ls -la dashboard-ui/build/data
EOF

# Step 5: Update code on Pi
echo -e "${YELLOW}Step 5: Updating code on Raspberry Pi...${NC}"
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

    # Fix .env configuration if needed
    echo "Ensuring correct .env configuration..."
    cd python-services

    # Create .env from example if it doesn't exist
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            echo "Created .env from .env.example"
        fi
    fi

    # Fix port configuration
    if [ -f .env ]; then
        # Ensure WS_PORT is 8000
        sed -i 's/WS_PORT=8765/WS_PORT=8000/g' .env
        # Ensure NFC_MOCK_MODE is false
        sed -i 's/NFC_MOCK_MODE=true/NFC_MOCK_MODE=false/g' .env
        echo "Updated .env configuration:"
        grep -E "WS_PORT|NFC_MOCK_MODE" .env || true
    fi

    cd ..

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
    
    # LED controller auto-detects hardware mode, no config needed
    echo "LED controller will auto-detect hardware mode..."
    
    echo -e "${GREEN}✓ Code updated successfully${NC}"
EOF

# Step 6: Restart services
echo -e "${YELLOW}Step 6: Restarting services...${NC}"

# First, ensure the restart script is executable
ssh $PI_HOST "chmod +x /home/loganrhyne/nfc-collection/deployment/restart-services.sh 2>/dev/null || true"

# Now run the restart script on the Pi
ssh $PI_HOST "bash /home/loganrhyne/nfc-collection/deployment/restart-services.sh"

# Alternative approach if the script doesn't exist yet
if [ $? -ne 0 ]; then
    echo "Using inline restart logic..."
    ssh $PI_HOST << 'EOF'
    # Note: Don't use set -e here so we can handle failures gracefully

    # Function to restart or start a service
    restart_service() {
        local service_name=$1
        local max_attempts=3
        local attempt=1

        echo "Managing $service_name service..."

        # First, always try to stop the service cleanly
        sudo systemctl stop $service_name 2>/dev/null || true
        sleep 2

        # Try to start the service
        while [ $attempt -le $max_attempts ]; do
            echo "  Attempt $attempt/$max_attempts: Starting $service_name..."

            # Clear any failed state
            sudo systemctl reset-failed $service_name 2>/dev/null || true

            # Start the service
            sudo systemctl start $service_name
            sleep 3

            # Check if it started successfully
            if sudo systemctl is-active --quiet $service_name; then
                echo "  ✓ $service_name started successfully"
                return 0
            else
                echo "  ✗ $service_name failed to start"
                if [ $attempt -lt $max_attempts ]; then
                    echo "  Retrying..."
                    sleep 2
                fi
            fi

            attempt=$((attempt + 1))
        done

        return 1
    }

    # Kill any stray Python processes that might be holding resources
    echo "Cleaning up any stray processes..."
    sudo pkill -f 'python.*server.py' 2>/dev/null || true
    sudo pkill -f 'python.*serve-spa.py' 2>/dev/null || true
    sleep 2

    # Restart services with retry logic
    websocket_success=false
    dashboard_success=false

    if restart_service "nfc-websocket"; then
        websocket_success=true
    fi

    if restart_service "nfc-dashboard"; then
        dashboard_success=true
    fi

    # If systemd services failed, fall back to manual start
    if [ "$websocket_success" = false ] || [ "$dashboard_success" = false ]; then
        echo ""
        echo "⚠️  Some services failed to start via systemd. Attempting manual start..."

        # Manual fallback for WebSocket server
        if [ "$websocket_success" = false ]; then
            echo "Starting WebSocket server manually..."
            # Use screen or tmux if available, otherwise use proper nohup with setsid
            if command -v screen &> /dev/null; then
                # Use screen for persistent session
                screen -dmS nfc-websocket bash -c "cd /home/loganrhyne/nfc-collection/python-services && source venv/bin/activate && python server.py 2>&1 | tee /tmp/nfc-websocket-manual.log"
                echo "  WebSocket server started in screen session 'nfc-websocket'"
                echo "  Logs: /tmp/nfc-websocket-manual.log"
                echo "  Attach with: screen -r nfc-websocket"
            else
                # Use setsid to properly detach from SSH session
                cd /home/loganrhyne/nfc-collection/python-services
                setsid bash -c "source venv/bin/activate && exec python server.py > /tmp/nfc-websocket-manual.log 2>&1" &
                sleep 2  # Give it time to start
                if pgrep -f "python.*server.py" > /dev/null; then
                    echo "  WebSocket server started manually"
                    echo "  Logs: /tmp/nfc-websocket-manual.log"
                else
                    echo "  ✗ Manual start failed - check /tmp/nfc-websocket-manual.log"
                fi
            fi
        fi

        # Manual fallback for dashboard
        if [ "$dashboard_success" = false ]; then
            echo "Starting dashboard server manually..."
            if command -v screen &> /dev/null; then
                # Use screen for persistent session
                sudo screen -dmS nfc-dashboard bash -c "cd /home/loganrhyne/nfc-collection/dashboard-ui && python3 /home/loganrhyne/nfc-collection/deployment/serve-spa.py 80 2>&1 | tee /tmp/nfc-dashboard-manual.log"
                echo "  Dashboard server started in screen session 'nfc-dashboard'"
                echo "  Logs: /tmp/nfc-dashboard-manual.log"
            else
                # Use setsid to properly detach
                cd /home/loganrhyne/nfc-collection/dashboard-ui
                sudo setsid python3 /home/loganrhyne/nfc-collection/deployment/serve-spa.py 80 > /tmp/nfc-dashboard-manual.log 2>&1 &
                echo "  Dashboard server started manually"
                echo "  Logs: /tmp/nfc-dashboard-manual.log"
            fi
        fi
    fi

    # Wait a bit for services to fully start
    sleep 3

    # Final status check
    echo ""
    echo "Service Status:"
    echo "==============="

    # Check WebSocket
    if sudo systemctl is-active --quiet nfc-websocket; then
        echo "✓ nfc-websocket: running (systemd)"
    elif pgrep -f "python.*server.py" > /dev/null; then
        echo "✓ nfc-websocket: running (manual)"
    else
        echo "✗ nfc-websocket: not running"
    fi

    # Check Dashboard
    if sudo systemctl is-active --quiet nfc-dashboard; then
        echo "✓ nfc-dashboard: running (systemd)"
    elif sudo lsof -i:80 > /dev/null 2>&1; then
        echo "✓ nfc-dashboard: running on port 80"
    else
        echo "✗ nfc-dashboard: not running"
    fi

    # Show what's on ports
    echo ""
    echo "Port status:"
    echo "  Port 80 (Dashboard):"
    sudo lsof -i:80 2>/dev/null | grep LISTEN || echo "    Nothing listening"
    echo "  Port 8000 (WebSocket):"
    sudo lsof -i:8000 2>/dev/null | grep LISTEN || echo "    Nothing listening"

    # Check if we can connect to WebSocket
    echo ""
    echo "Testing WebSocket connectivity:"
    if nc -zv 127.0.0.1 8000 2>&1 | grep -q succeeded; then
        echo "  ✓ WebSocket server is accepting connections on port 8000"
    else
        echo "  ✗ WebSocket server is NOT accepting connections"
        echo "  Check logs: tail -f /tmp/nfc-websocket-manual.log"
    fi
EOF
fi

# Cleanup
rm -rf $DEPLOY_TEMP

# Step 7: Verify deployment
echo -e "${YELLOW}Step 7: Verifying deployment...${NC}"
ssh $PI_HOST << 'EOF'
    echo "Checking build timestamp..."
    ls -la /home/loganrhyne/nfc-collection/dashboard-ui/build/index.html
    
    echo ""
    echo "Checking media directory setup..."
    ls -la /home/loganrhyne/nfc-collection/dashboard-ui/build/data
    echo "Media directory contents:"
    ls -la /home/loganrhyne/nfc-media/ 2>/dev/null || echo "Media directory not yet populated"
    
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
echo "WebSocket URL: http://192.168.1.114:8000/"
echo ""
echo "To check logs on the Pi:"
echo "  WebSocket: ssh $PI_HOST 'sudo journalctl -u nfc-websocket -f'"
echo "  Dashboard: ssh $PI_HOST 'sudo journalctl -u nfc-dashboard -f'"
echo ""
echo "If you see an old version, run on the Pi:"
echo "  sudo deployment/diagnose-web-server.sh"
echo "  sudo deployment/fix-web-server.sh"
echo ""
echo -e "${YELLOW}Note: Media files are now stored separately in /home/loganrhyne/nfc-media${NC}"
echo "To sync media from your other machine, run:"
echo "  ./scripts/sync-media.sh"