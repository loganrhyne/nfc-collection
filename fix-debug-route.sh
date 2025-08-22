#!/bin/bash
# Complete fix for /debug route 404 issue
# Run this on your development machine

set -e

echo "=== Fixing /debug Route 404 Issue ==="
echo ""

# Configuration
PI_HOST="loganrhyne@192.168.1.114"
PI_APP_DIR="/home/loganrhyne/nfc-collection"

# Step 1: Copy the fix scripts to Pi
echo "1. Copying fix scripts to Pi..."
scp deployment/diagnose-routing.sh deployment/fix-routing-final.sh deployment/serve-spa.py $PI_HOST:$PI_APP_DIR/deployment/

# Step 2: Run the fix on Pi
echo ""
echo "2. Running fix on Pi..."
ssh $PI_HOST "cd $PI_APP_DIR && sudo ./deployment/fix-routing-final.sh"

echo ""
echo "=== Fix applied! ==="
echo ""
echo "Try accessing: http://192.168.1.114/debug"
echo ""
echo "If it still shows 404:"
echo "1. Hard refresh your browser (Ctrl+Shift+R)"
echo "2. Try in an incognito/private window"
echo "3. Run diagnostics: ssh $PI_HOST 'cd $PI_APP_DIR && ./deployment/diagnose-routing.sh'"