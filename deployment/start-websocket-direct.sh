#!/bin/bash
# Direct WebSocket server starter (bypasses systemd)
# This is called during deployment for immediate startup

echo "[$(date)] Direct WebSocket Server Start"

# Kill any existing server
echo "Stopping any existing WebSocket server..."
sudo pkill -f 'python.*server.py' 2>/dev/null
sleep 2

# Start the server directly in background
cd /home/loganrhyne/nfc-collection/python-services

# Create a startup script that will run detached
cat > /tmp/start-nfc-ws.sh << 'SCRIPT'
#!/bin/bash
cd /home/loganrhyne/nfc-collection/python-services
source venv/bin/activate

# Clean up GPIO
for pin in 25 8 7; do
    if [ -d "/sys/class/gpio/gpio$pin" ]; then
        echo $pin > /sys/class/gpio/unexport 2>/dev/null || true
    fi
done
sleep 1

# Start server
exec python server.py >> /var/log/nfc-websocket.log 2>&1
SCRIPT

chmod +x /tmp/start-nfc-ws.sh

# Start with nohup and proper detachment
nohup /tmp/start-nfc-ws.sh > /tmp/nfc-ws-start.log 2>&1 &
disown

# Wait and verify
sleep 3

# Check if it's running
if pgrep -f "python.*server.py" > /dev/null; then
    echo "✓ WebSocket server started successfully"

    # Double-check port
    if sudo lsof -i:8000 > /dev/null 2>&1; then
        echo "✓ Listening on port 8000"
        exit 0
    else
        echo "⚠ Process running but not listening on port 8000 yet"
        echo "  Waiting 5 more seconds..."
        sleep 5

        if sudo lsof -i:8000 > /dev/null 2>&1; then
            echo "✓ Now listening on port 8000"
            exit 0
        else
            echo "✗ Failed to bind to port 8000"
            exit 1
        fi
    fi
else
    echo "✗ WebSocket server failed to start"
    echo "Check logs: /var/log/nfc-websocket.log"
    exit 1
fi