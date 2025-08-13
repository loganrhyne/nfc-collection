#!/bin/bash

# NFC Collection Startup Script
# This script starts both the Python WebSocket server and React app in the correct order

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PYTHON_DIR="$PROJECT_ROOT/python-services"
DASHBOARD_DIR="$PROJECT_ROOT/dashboard-ui"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Starting NFC Collection services...${NC}"

# Check for .env file
if [ ! -f "$PYTHON_DIR/.env" ]; then
    echo -e "${YELLOW}No .env file found. Creating from .env.example...${NC}"
    if [ -f "$PYTHON_DIR/.env.example" ]; then
        cp "$PYTHON_DIR/.env.example" "$PYTHON_DIR/.env"
        echo -e "${GREEN}Created .env file. Please review settings.${NC}"
    fi
fi

# 1. Start Python WebSocket server first
echo -e "${GREEN}Starting Python WebSocket server...${NC}"
cd "$PYTHON_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Virtual environment not found. Creating...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Start server with proper logging
python server.py &
PYTHON_PID=$!

# Wait for Python server to be ready
echo "Waiting for WebSocket server to be ready..."
PORT=${WS_PORT:-8765}
for i in {1..30}; do
    if curl -s "http://localhost:$PORT/health" > /dev/null 2>&1; then
        echo -e "${GREEN}WebSocket server is ready!${NC}"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 1
done

# 2. Start React development server
echo -e "${GREEN}Starting React app...${NC}"
cd "$DASHBOARD_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Node modules not found. Installing...${NC}"
    npm install
fi

npm start &
REACT_PID=$!

echo ""
echo -e "${GREEN}Services started:${NC}"
echo "  Python WebSocket server (PID: $PYTHON_PID)"
echo "  React app (PID: $REACT_PID)"
echo ""
echo "Health check: http://localhost:$PORT/health"
echo "Metrics: http://localhost:$PORT/metrics"
echo ""
echo "To stop all services, run: kill $PYTHON_PID $REACT_PID"

# Trap to cleanup on exit
trap "kill $PYTHON_PID $REACT_PID 2>/dev/null" EXIT

# Keep script running
wait