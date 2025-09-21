#!/bin/bash
# Simple test to see if the WebSocket server can start

echo "============================================"
echo "Simple WebSocket Server Test"
echo "============================================"

echo -e "\n🧹 Cleaning up any existing processes..."
sudo pkill -f 'python.*server.py' 2>/dev/null
sleep 2

echo -e "\n📋 Configuration check:"
echo "Looking for .env file..."
if [ -f ~/nfc-collection/python-services/.env ]; then
    echo "✓ .env file exists"
    echo "Port configuration:"
    grep "WS_PORT" ~/nfc-collection/python-services/.env
    echo "NFC Mode:"
    grep "NFC_MOCK_MODE" ~/nfc-collection/python-services/.env
else
    echo "✗ No .env file found"
fi

echo -e "\n🚀 Starting server..."
cd ~/nfc-collection/python-services
source venv/bin/activate

echo "Python: $(which python)"
echo "Starting server.py..."

# Start server and capture output for 10 seconds
timeout 10 python server.py 2>&1 | tee /tmp/server-test.log &
PID=$!

# Wait for server to start
sleep 3

echo -e "\n🔍 Checking if server is running..."
if ps -p $PID > /dev/null 2>&1; then
    echo "✓ Server process is running (PID: $PID)"
else
    echo "✗ Server process died"
fi

echo -e "\n🌐 Checking port 8000..."
if sudo lsof -i:8000 > /dev/null 2>&1; then
    echo "✓ Server is listening on port 8000"
    sudo lsof -i:8000 | grep LISTEN
else
    echo "✗ Nothing listening on port 8000"
fi

echo -e "\n📝 Server output:"
cat /tmp/server-test.log

echo -e "\n🛑 Stopping test server..."
kill $PID 2>/dev/null
sudo pkill -f 'python.*server.py' 2>/dev/null

echo -e "\n============================================"
echo "Test complete!"
echo "If the server didn't start, check the output above for errors."
echo "============================================"