#!/bin/bash
# Wrapper script for starting the NFC WebSocket server
# Handles GPIO initialization and error recovery

echo "[$(date)] Starting NFC WebSocket Server wrapper..."

# Ensure we're in the right directory
cd /home/loganrhyne/nfc-collection/python-services

# Activate virtual environment
source venv/bin/activate

# Clean up any stale GPIO exports
echo "[$(date)] Cleaning up GPIO..."
for pin in 25 8 7; do
    if [ -d "/sys/class/gpio/gpio$pin" ]; then
        echo $pin | sudo tee /sys/class/gpio/unexport 2>/dev/null || true
    fi
done

# Wait for GPIO to be ready
sleep 2

# Set Python path to avoid import issues
export PYTHONPATH=/home/loganrhyne/nfc-collection/python-services:$PYTHONPATH

# Start the server with error handling
echo "[$(date)] Starting Python server..."
attempts=0
max_attempts=5

while [ $attempts -lt $max_attempts ]; do
    attempts=$((attempts + 1))
    echo "[$(date)] Attempt $attempts of $max_attempts..."

    # Try to start the server
    python server.py
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "[$(date)] Server exited normally"
        break
    else
        echo "[$(date)] Server crashed with exit code $exit_code"

        if [ $attempts -lt $max_attempts ]; then
            echo "[$(date)] Waiting 5 seconds before retry..."
            sleep 5

            # Clean up GPIO again
            for pin in 25 8 7; do
                if [ -d "/sys/class/gpio/gpio$pin" ]; then
                    echo $pin | sudo tee /sys/class/gpio/unexport 2>/dev/null || true
                fi
            done
            sleep 2
        else
            echo "[$(date)] Max attempts reached, giving up"
            exit 1
        fi
    fi
done