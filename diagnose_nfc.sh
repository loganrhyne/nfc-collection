#!/bin/bash
# Comprehensive NFC hardware diagnostic script

echo "============================================"
echo "NFC Hardware Diagnostic Tool"
echo "============================================"

# Check I2C is enabled
echo -e "\n📋 Checking I2C status..."
if [ -e /dev/i2c-1 ]; then
    echo "✅ I2C device exists (/dev/i2c-1)"
else
    echo "❌ I2C device not found! Run: sudo raspi-config and enable I2C"
    exit 1
fi

# Check user is in i2c group
echo -e "\n👤 Checking user permissions..."
if groups | grep -q i2c; then
    echo "✅ User is in i2c group"
else
    echo "⚠️  User not in i2c group. Run: sudo usermod -a -G i2c $USER"
    echo "   Then logout and login again"
fi

# Scan I2C bus
echo -e "\n🔍 Scanning I2C bus for devices..."
echo "Expected: PN532 at address 0x24"
echo "----------------------------------------"
i2c_output=$(sudo i2cdetect -y 1 2>&1)
echo "$i2c_output"
echo "----------------------------------------"

# Check for PN532 at expected address
if echo "$i2c_output" | grep -q "24"; then
    echo "✅ Device detected at address 0x24 (likely PN532)"
else
    echo "❌ No device at address 0x24"

    # Check if ANY devices are detected
    if echo "$i2c_output" | grep -qE "[0-9a-f]{2}"; then
        echo "⚠️  Other I2C devices detected - PN532 may be at wrong address"
        echo "   Check DIP switch settings"
    else
        echo "⚠️  NO I2C devices detected at all"
        echo ""
        echo "Troubleshooting checklist:"
        echo "1. Power:"
        echo "   - Is PN532 powered? (LED should be on)"
        echo "   - Using 3.3V or 5V? (3.3V is recommended for Pi)"
        echo ""
        echo "2. Wiring (using physical pin numbers):"
        echo "   - SDA: Pin 3 (GPIO 2)"
        echo "   - SCL: Pin 5 (GPIO 3)"
        echo "   - VCC: Pin 1 or 17 (3.3V)"
        echo "   - GND: Pin 6, 9, 14, 20, 25, 30, 34, or 39"
        echo ""
        echo "3. DIP Switches (for I2C mode):"
        echo "   - Switch 1: ON (up position)"
        echo "   - Switch 2: OFF (down position)"
        echo ""
        echo "4. Connection quality:"
        echo "   - Are jumper wires firmly connected?"
        echo "   - Try different jumper wires if available"
    fi
fi

# Test with Python if device found
if echo "$i2c_output" | grep -q "24"; then
    echo -e "\n🐍 Testing with Python..."

    # Create simple test script
    cat > /tmp/test_i2c.py << 'EOF'
#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.expanduser('~/nfc-collection/python-services'))

try:
    import board
    import busio
    print("✅ Python I2C libraries loaded")

    # Try to create I2C bus
    i2c = busio.I2C(board.SCL, board.SDA)
    print("✅ I2C bus created")

    # Try to import PN532
    try:
        from adafruit_pn532.i2c import PN532_I2C
        print("✅ PN532 library loaded")

        # Try to connect
        pn532 = PN532_I2C(i2c, debug=False)
        ic, ver, rev, support = pn532.firmware_version
        print(f"✅ PN532 connected! Firmware: {ver}.{rev}")

    except Exception as e:
        print(f"❌ Failed to connect to PN532: {e}")

except ImportError as e:
    print(f"❌ Missing Python library: {e}")
    print("   Run: ./install_nfc_pi.sh to install dependencies")
except Exception as e:
    print(f"❌ Error: {e}")
EOF

    # Run test with venv if it exists
    if [ -f "$HOME/nfc-collection/python-services/venv/bin/python" ]; then
        echo "Using virtual environment..."
        $HOME/nfc-collection/python-services/venv/bin/python /tmp/test_i2c.py
    else
        echo "Using system Python..."
        python3 /tmp/test_i2c.py
    fi

    rm /tmp/test_i2c.py
fi

echo -e "\n============================================"
echo "Diagnostic Summary"
echo "============================================"

# Final summary
if echo "$i2c_output" | grep -q "24"; then
    echo "✅ Hardware detected - ready for software testing"
    echo "   Next step: python3 test_nfc_pi.py"
else
    echo "❌ Hardware not detected - check physical connections"
    echo "   See troubleshooting steps above"
fi

echo "============================================"