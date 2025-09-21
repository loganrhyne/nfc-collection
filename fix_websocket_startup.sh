#!/bin/bash
# Fix WebSocket startup issues

echo "============================================"
echo "Fixing WebSocket Startup Issues"
echo "============================================"

echo -e "\n1️⃣ Fixing .env configuration..."
cd ~/nfc-collection/python-services

# Fix port configuration
if grep -q "WS_PORT=8765" .env 2>/dev/null; then
    echo "  Changing WS_PORT from 8765 to 8000..."
    sed -i 's/WS_PORT=8765/WS_PORT=8000/g' .env
else
    echo "  WS_PORT already set correctly"
fi

# Verify mock mode is disabled
if grep -q "NFC_MOCK_MODE=true" .env 2>/dev/null; then
    echo "  Disabling NFC_MOCK_MODE..."
    sed -i 's/NFC_MOCK_MODE=true/NFC_MOCK_MODE=false/g' .env
else
    echo "  NFC_MOCK_MODE already disabled"
fi

echo -e "\n  Updated configuration:"
grep "WS_PORT\|NFC_MOCK_MODE" .env

echo -e "\n2️⃣ Stopping ALL processes that might use GPIO..."
# Stop systemd services
sudo systemctl stop nfc-websocket 2>/dev/null
sudo systemctl stop nfc-dashboard 2>/dev/null

# Kill any Python processes
sudo pkill -f 'python' 2>/dev/null
sleep 2

echo -e "\n3️⃣ Releasing GPIO pins..."
# Release GPIO pins through sysfs
for pin in 25 8 7; do
    if [ -d "/sys/class/gpio/gpio$pin" ]; then
        echo "  Unexporting GPIO $pin..."
        echo $pin | sudo tee /sys/class/gpio/unexport
    fi
done

# Also try using lgpio to release
python3 << 'EOF' 2>/dev/null
try:
    import lgpio
    h = lgpio.gpiochip_open(0)
    for pin in [25, 8, 7]:
        try:
            lgpio.gpio_free(h, pin)
        except:
            pass
    lgpio.gpiochip_close(h)
    print("  Released GPIOs via lgpio")
except:
    pass
EOF

echo -e "\n4️⃣ Checking what's still using GPIO/SPI..."
echo "  Processes using /dev/spi*:"
sudo lsof /dev/spi* 2>/dev/null || echo "    None"

echo "  Processes using /dev/gpiochip*:"
sudo lsof /dev/gpiochip* 2>/dev/null || echo "    None"

echo -e "\n5️⃣ Waiting for resources to release..."
sleep 3

echo -e "\n6️⃣ Testing if we can access GPIO now..."
cd ~/nfc-collection/python-services
source venv/bin/activate

python3 << 'EOF'
import sys
try:
    import board
    from digitalio import DigitalInOut

    # Try to access the CS pin
    cs_pin = DigitalInOut(board.D25)
    cs_pin.deinit()  # Release it immediately
    print("  ✓ Can access GPIO 25")
except Exception as e:
    print(f"  ✗ Still cannot access GPIO 25: {e}")
    sys.exit(1)
EOF

if [ $? -eq 0 ]; then
    echo -e "\n✅ GPIO is now accessible!"

    echo -e "\n7️⃣ Starting WebSocket server..."
    # Use the manual start script
    ~/nfc-collection/start_services_manual.sh
else
    echo -e "\n⚠️ GPIO still busy. Trying more aggressive cleanup..."

    # More aggressive cleanup
    echo -e "\n8️⃣ Performing aggressive cleanup..."

    # Stop any screen sessions
    screen -ls | grep nfc | awk '{print $1}' | xargs -I {} screen -X -S {} quit 2>/dev/null

    # Kill anything using Python
    sudo killall -9 python python3 2>/dev/null
    sleep 2

    # Reset SPI
    sudo modprobe -r spi_bcm2835 2>/dev/null
    sudo modprobe spi_bcm2835 2>/dev/null

    echo "  Waiting 5 seconds for full reset..."
    sleep 5

    echo -e "\n9️⃣ Final attempt to start server..."
    cd ~/nfc-collection/python-services
    source venv/bin/activate

    # Start directly
    python server.py > /tmp/websocket.log 2>&1 &
    SERVER_PID=$!
    sleep 3

    if ps -p $SERVER_PID > /dev/null; then
        echo "✅ Server started (PID: $SERVER_PID)"
        echo "Logs: tail -f /tmp/websocket.log"
    else
        echo "❌ Server still won't start"
        echo "Last error:"
        tail -20 /tmp/websocket.log
    fi
fi

echo -e "\n============================================"
echo "Fix attempt complete!"
echo "Check http://192.168.1.114/ to see if it's working"
echo "============================================"