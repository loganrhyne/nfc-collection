#!/bin/bash
# Check what's using GPIO pins

echo "============================================"
echo "GPIO Pin Usage Checker"
echo "============================================"

echo -e "\n📊 Checking for processes using GPIO..."

# Check for any Python processes that might be using GPIO
echo -e "\nPython processes:"
ps aux | grep python | grep -v grep

# Check GPIO exports
echo -e "\n📌 GPIO exports:"
if [ -d /sys/class/gpio ]; then
    ls -la /sys/class/gpio/
else
    echo "No GPIO exports found"
fi

# Check SPI device
echo -e "\n🔌 SPI devices:"
ls -la /dev/spi* 2>/dev/null || echo "No SPI devices found"

# Check if SPI is enabled
echo -e "\n⚙️ SPI status:"
if lsmod | grep -q spi_bcm; then
    echo "SPI kernel module loaded"
    lsmod | grep spi
else
    echo "SPI kernel module not loaded"
fi

# Check for the NFC server
echo -e "\n🔍 Checking for NFC server process..."
if systemctl is-active nfc-websocket >/dev/null 2>&1; then
    echo "⚠️  nfc-websocket service is running!"
    echo "   This may be holding the GPIO pins"
    echo "   To stop: sudo systemctl stop nfc-websocket"
else
    echo "nfc-websocket service not running"
fi

# Check for any process using the specific pins
echo -e "\n📍 Checking specific GPIO pins..."
for pin in 25 8 7; do
    if [ -d "/sys/class/gpio/gpio$pin" ]; then
        echo "GPIO $pin is exported"
    fi
done

echo -e "\n============================================"
echo "Recommendations:"
echo "============================================"
echo "1. Stop any running NFC services:"
echo "   sudo systemctl stop nfc-websocket"
echo ""
echo "2. Kill any Python processes using GPIO:"
echo "   sudo pkill -f 'python.*server.py'"
echo ""
echo "3. Enable SPI if not enabled:"
echo "   sudo raspi-config (Interface Options > SPI > Enable)"
echo ""
echo "4. Then try the test again:"
echo "   ./test_nfc_modes.sh"
echo "============================================"