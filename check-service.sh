#!/bin/bash
# Quick service diagnostic script

echo "=== NFC Server Diagnostic ==="
echo ""

# Check if port 8000 is in use
echo "1. Checking port 8000:"
sudo netstat -tlnp | grep :8000 || echo "  Port 8000 is free"
echo ""

# Check for any Python processes
echo "2. Python processes:"
ps aux | grep python | grep -v grep || echo "  No Python processes running"
echo ""

# Check service status
echo "3. Service status:"
sudo systemctl status nfc-server --no-pager -l
echo ""

# Check last 30 lines of logs
echo "4. Recent logs:"
sudo journalctl -u nfc-server -n 30 --no-pager
echo ""

# Check if venv exists and works
echo "5. Python environment:"
if [ -f ~/nfc-collection/python-services/venv/bin/python ]; then
    ~/nfc-collection/python-services/venv/bin/python --version
    echo "  Checking imports..."
    ~/nfc-collection/python-services/venv/bin/python -c "
import socketio
import aiohttp
print('  ✓ Core packages available')
try:
    import board
    print('  ✓ Hardware packages available')
except:
    print('  ✗ Hardware packages not available')
"
else
    echo "  ✗ Virtual environment not found!"
fi
echo ""

# Check file permissions
echo "6. File permissions:"
ls -la ~/nfc-collection/python-services/server_clean.py
echo ""

# Try running the server directly
echo "7. Direct test (5 seconds):"
echo "  Attempting to start server directly..."
timeout 5 ~/nfc-collection/python-services/venv/bin/python ~/nfc-collection/python-services/server_clean.py 2>&1 | head -20