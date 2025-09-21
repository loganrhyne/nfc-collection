#!/bin/bash
# Simple diagnostic to find out WHY the WebSocket server won't start

echo "============================================"
echo "WebSocket Server Diagnostic"
echo "============================================"

echo -e "\n1️⃣ Checking if server.py exists..."
if [ -f ~/nfc-collection/python-services/server.py ]; then
    echo "✓ server.py exists"
else
    echo "✗ server.py NOT FOUND!"
    exit 1
fi

echo -e "\n2️⃣ Checking Python virtual environment..."
if [ -d ~/nfc-collection/python-services/venv ]; then
    echo "✓ Virtual environment exists"

    # Check if activation works
    if source ~/nfc-collection/python-services/venv/bin/activate 2>/dev/null; then
        echo "✓ Can activate virtual environment"
        which python
        python --version
        deactivate
    else
        echo "✗ Cannot activate virtual environment"
    fi
else
    echo "✗ Virtual environment NOT FOUND!"
fi

echo -e "\n3️⃣ Checking if port 8000 is already in use..."
if sudo lsof -i:8000 > /dev/null 2>&1; then
    echo "⚠️  Port 8000 is already in use by:"
    sudo lsof -i:8000
    echo "Killing process using port 8000..."
    sudo fuser -k 8000/tcp 2>/dev/null
    sleep 2
else
    echo "✓ Port 8000 is free"
fi

echo -e "\n4️⃣ Checking GPIO devices..."
if [ -c /dev/spidev0.0 ]; then
    echo "✓ SPI device exists"
    ls -la /dev/spidev*
else
    echo "⚠️  No SPI device found"
fi

echo -e "\n5️⃣ Checking user permissions..."
echo "Current user: $(whoami)"
echo "Groups: $(groups)"
if groups | grep -q gpio; then
    echo "✓ User is in gpio group"
else
    echo "⚠️  User is NOT in gpio group"
fi

echo -e "\n6️⃣ Trying to import Python dependencies..."
cd ~/nfc-collection/python-services
source venv/bin/activate 2>/dev/null

python3 << 'EOF'
import sys
print(f"Python path: {sys.executable}")
print(f"Python version: {sys.version}")

try:
    import aiohttp
    print("✓ aiohttp imported successfully")
except ImportError as e:
    print(f"✗ Failed to import aiohttp: {e}")

try:
    import socketio
    print("✓ socketio imported successfully")
except ImportError as e:
    print(f"✗ Failed to import socketio: {e}")

try:
    import board
    print("✓ board imported successfully")
except Exception as e:
    print(f"⚠️  Failed to import board (GPIO): {e}")

try:
    from services.nfc_service import NFCService
    print("✓ NFCService imported successfully")
except Exception as e:
    print(f"✗ Failed to import NFCService: {e}")
EOF

deactivate

echo -e "\n7️⃣ Attempting to start server directly..."
echo "Starting server with explicit error output..."
cd ~/nfc-collection/python-services
source venv/bin/activate

# Start the server and capture the actual error
timeout 5 python server.py 2>&1 | head -50

echo -e "\n8️⃣ Checking log files..."
echo "Last 20 lines of /var/log/nfc-websocket.log:"
sudo tail -20 /var/log/nfc-websocket.log 2>/dev/null || echo "No log file found"

echo -e "\n9️⃣ Checking systemd journal for errors..."
echo "Recent nfc-websocket service logs:"
sudo journalctl -u nfc-websocket -n 20 --no-pager 2>/dev/null || echo "No systemd logs found"

echo -e "\n============================================"
echo "Diagnostic complete!"
echo "Look for any errors above to identify the issue."
echo "============================================"