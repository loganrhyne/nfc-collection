#!/bin/bash
# Install NFC hardware dependencies on Raspberry Pi

echo "============================================"
echo "NFC Hardware Library Installation Script"
echo "============================================"

# Check if running on a Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    echo "⚠️  Warning: This doesn't appear to be a Raspberry Pi"
    echo "Continue anyway? (y/n)"
    read -r response
    if [[ "$response" != "y" ]]; then
        echo "Exiting..."
        exit 1
    fi
fi

echo -e "\n📦 Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y python3-pip python3-dev i2c-tools

echo -e "\n🔧 Enabling I2C interface..."
# Enable I2C
sudo raspi-config nonint do_i2c 0
# Add user to i2c group
sudo usermod -a -G i2c $USER

echo -e "\n🐍 Installing Python dependencies..."
pip3 install --upgrade pip
pip3 install adafruit-circuitpython-pn532
pip3 install board
pip3 install busio

echo -e "\n🔍 Checking I2C devices..."
sudo i2cdetect -y 1

echo -e "\n✅ Installation complete!"
echo ""
echo "============================================"
echo "Next Steps:"
echo "============================================"
echo "1. Check that your PN532 appears in the i2cdetect output above"
echo "   - It should show up as address 0x24"
echo "   - If not, check your wiring:"
echo "     * SDA -> GPIO 2 (Pin 3)"
echo "     * SCL -> GPIO 3 (Pin 5)"
echo "     * VCC -> 3.3V (Pin 1)"
echo "     * GND -> Ground (Pin 6)"
echo ""
echo "2. You may need to logout and login for group changes to take effect"
echo ""
echo "3. Test NFC hardware:"
echo "   cd ~/nfc-collection"
echo "   python3 test_nfc_pi.py"
echo ""
echo "4. If still having issues, try:"
echo "   - Reboot the Pi: sudo reboot"
echo "   - Check the PN532 DIP switches (should be set to I2C mode)"
echo "============================================"