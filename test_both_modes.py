#!/usr/bin/env python3
"""
Test PN532 in both SPI and I2C modes to determine actual configuration
"""

import sys
import os
import time

# Use venv if available
venv_path = os.path.expanduser('~/nfc-collection/python-services/venv')
if os.path.exists(venv_path):
    activate_this = os.path.join(venv_path, 'bin', 'activate_this.py')
    if os.path.exists(activate_this):
        exec(open(activate_this).read(), {'__file__': activate_this})

sys.path.insert(0, os.path.expanduser('~/nfc-collection/python-services'))

print("=" * 60)
print("PN532 Connection Mode Tester")
print("=" * 60)

# Test I2C Mode
print("\n🔍 Testing I2C Mode...")
print("-" * 40)
try:
    import board
    import busio
    from adafruit_pn532.i2c import PN532_I2C

    i2c = busio.I2C(board.SCL, board.SDA)
    print("✅ I2C bus created")

    # Try with debug mode to see more info
    pn532_i2c = PN532_I2C(i2c, debug=True, irq=None, reset=None)
    print("Attempting to read firmware version...")

    ic, ver, rev, support = pn532_i2c.firmware_version
    print(f"✅ I2C MODE WORKS! PN532 Firmware: {ver}.{rev}")
    print(f"   IC: {ic:02x}, Support: {support:02x}")

except Exception as e:
    print(f"❌ I2C mode failed: {e}")

# Test SPI Mode
print("\n🔍 Testing SPI Mode...")
print("-" * 40)
try:
    import board
    import busio
    from digitalio import DigitalInOut
    from adafruit_pn532.spi import PN532_SPI

    # Try common CS pins
    cs_pins_to_try = ['D25', 'D8', 'CE0', 'D5']

    for cs_pin_name in cs_pins_to_try:
        try:
            print(f"Trying CS pin: {cs_pin_name}")

            spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
            cs_pin = DigitalInOut(getattr(board, cs_pin_name))

            pn532_spi = PN532_SPI(spi, cs_pin, debug=False)
            ic, ver, rev, support = pn532_spi.firmware_version

            print(f"✅ SPI MODE WORKS with CS pin {cs_pin_name}!")
            print(f"   PN532 Firmware: {ver}.{rev}")
            print(f"   IC: {ic:02x}, Support: {support:02x}")
            break

        except AttributeError:
            print(f"   Pin {cs_pin_name} not available")
        except Exception as e:
            print(f"   Failed with {cs_pin_name}: {str(e)[:50]}")
    else:
        print("❌ SPI mode failed with all tested CS pins")

except ImportError as e:
    print(f"❌ Missing library for SPI test: {e}")
except Exception as e:
    print(f"❌ SPI test error: {e}")

# Check DIP switches interpretation
print("\n" + "=" * 60)
print("📌 DIP Switch Configuration Guide")
print("=" * 60)
print("If I2C worked:")
print("  Switch 1: ON (up), Switch 2: OFF (down)")
print("")
print("If SPI worked:")
print("  Switch 1: OFF (down), Switch 2: ON (up)")
print("")
print("Note: Some PN532 boards have the switches labeled")
print("      differently or reversed. Try both if unsure!")
print("=" * 60)