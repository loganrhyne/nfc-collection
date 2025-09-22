#!/bin/bash
# Check what's actually running

echo "============================================"
echo "Service Status Check"
echo "============================================"

echo -e "\n1. What Python processes are running?"
ps aux | grep python | grep -v grep

echo -e "\n2. What's on port 8000?"
sudo lsof -i:8000

echo -e "\n3. Check hardware service logs:"
sudo journalctl -u nfc-hardware -n 20 --no-pager

echo -e "\n4. Which server.py is running?"
if pgrep -f "server.py" > /dev/null; then
    echo "Old server.py is running (original architecture)"
    pgrep -fla "server.py"
fi

if pgrep -f "websocket_server.py" > /dev/null; then
    echo "New websocket_server.py is running (new architecture)"
    pgrep -fla "websocket_server.py"
fi

if pgrep -f "hardware_service.py" > /dev/null; then
    echo "Hardware service is running (new architecture)"
    pgrep -fla "hardware_service.py"
fi

echo -e "\n5. Files that exist:"
echo "Old architecture:"
[ -f "python-services/server.py" ] && echo "  ✓ server.py exists" || echo "  ✗ server.py missing"

echo "New architecture:"
[ -f "python-services/websocket_server.py" ] && echo "  ✓ websocket_server.py exists" || echo "  ✗ websocket_server.py missing"
[ -f "python-services/hardware_service.py" ] && echo "  ✓ hardware_service.py exists" || echo "  ✗ hardware_service.py missing"

echo -e "\n============================================"
echo "Summary:"
echo "============================================"

if pgrep -f "server.py" > /dev/null; then
    echo "You're still running the OLD architecture (server.py)"
    echo "This is OK for now - it's working!"
    echo ""
    echo "The new files haven't been deployed yet."
    echo "Run ./deploy-clean.sh from your dev machine to switch to the new architecture."
else
    echo "New architecture is partially deployed"
fi