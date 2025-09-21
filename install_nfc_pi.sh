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

echo -e "\n🐍 Setting up Python virtual environment..."

# Check if venv exists, create if not
VENV_PATH="$HOME/nfc-collection/python-services/venv"
if [ ! -d "$VENV_PATH" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_PATH"
fi

# Activate venv and install dependencies
echo "Installing Python dependencies in virtual environment..."
source "$VENV_PATH/bin/activate"

pip install --upgrade pip
pip install adafruit-circuitpython-pn532
pip install adafruit-circuitpython-busdevice
pip install adafruit-blinka
pip install pyserial

deactivate
echo "✅ Python dependencies installed in venv"

echo -e "\n🔍 Checking I2C devices..."
echo "Looking for PN532 at address 0x24..."
i2c_output=$(sudo i2cdetect -y 1)
echo "$i2c_output"

# Check if 0x24 is present
if echo "$i2c_output" | grep -q "24"; then
    echo -e "\n✅ PN532 detected at address 0x24!"
else
    echo -e "\n⚠️  PN532 not detected at expected address 0x24"
    echo "Please check:"
    echo "  1. PN532 is powered on"
    echo "  2. PN532 DIP switches are set for I2C mode (switch 1: ON, switch 2: OFF)"
    echo "  3. Wiring connections are correct"
fi

echo -e "\n✅ Installation complete!"
echo ""
echo "============================================"
echo "Next Steps:"
echo "============================================"
echo "1. Verify PN532 is detected at address 0x24 (see above)"
echo ""
echo "2. PN532 I2C Wiring Guide:"
echo "   * SDA (Yellow) -> GPIO 2 (Pin 3)"
echo "   * SCL (Blue)   -> GPIO 3 (Pin 5)"
echo "   * VCC (Red)    -> 3.3V (Pin 1 or 17)"
echo "   * GND (Black)  -> Ground (Pin 6, 9, 14, 20, 25, 30, 34, or 39)"
echo ""
echo "3. PN532 DIP Switch Settings for I2C:"
echo "   * Switch 1: ON  (up)"
echo "   * Switch 2: OFF (down)"
echo ""
echo "4. Test NFC hardware:"
echo "   cd ~/nfc-collection"
echo "   python3 test_nfc_pi.py"
echo ""
echo "5. If issues persist:"
echo "   - Logout and login for group changes: exit && ssh back in"
echo "   - Or reboot the Pi: sudo reboot"
echo "============================================"