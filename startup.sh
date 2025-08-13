#!/bin/bash

# NFC Collection Startup Script
# This script starts both the Python WebSocket server and React app in the correct order

echo "Starting NFC Collection services..."

# 1. Start Python WebSocket server first
echo "Starting Python WebSocket server..."
cd /home/loganrhyne/nfc-collection/python-services
source venv/bin/activate
python server.py &
PYTHON_PID=$!

# Wait for Python server to be ready (check if port 8765 is listening)
echo "Waiting for WebSocket server to be ready..."
for i in {1..30}; do
    if netstat -tuln | grep -q ":8765 "; then
        echo "WebSocket server is ready!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 1
done

# 2. Start React development server
echo "Starting React app..."
cd /home/loganrhyne/nfc-collection/dashboard-ui
npm start &
REACT_PID=$!

echo "Services started:"
echo "  Python WebSocket server (PID: $PYTHON_PID)"
echo "  React app (PID: $REACT_PID)"
echo ""
echo "To stop all services, run: kill $PYTHON_PID $REACT_PID"

# Keep script running
wait