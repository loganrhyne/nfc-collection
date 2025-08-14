#!/usr/bin/env python3
"""
Debug script to test NFC hardware directly
"""

import board
import busio
from digitalio import DigitalInOut
from adafruit_pn532.spi import PN532_SPI
import time

print("Initializing NFC hardware...")

# Initialize PN532
spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
cs_pin = DigitalInOut(board.D25)
pn532 = PN532_SPI(spi, cs_pin, debug=False)

# Check firmware
ic, ver, rev, support = pn532.firmware_version
print(f"PN532 Firmware Version: {ver}.{rev}")

# Configure
pn532.SAM_configuration()
print("NFC hardware configured")

print("\nTesting different timeout values...")
print("Place a tag on the reader...\n")

# Test different timeout approaches
while True:
    # Test 1: Default timeout
    print("Test 1: Default timeout...", end='', flush=True)
    uid = pn532.read_passive_target()
    if uid:
        print(f" FOUND: {[hex(i) for i in uid]}")
        break
    else:
        print(" no tag")
    
    time.sleep(0.5)
    
    # Test 2: Explicit timeout as float
    print("Test 2: Timeout 0.1...", end='', flush=True)
    try:
        uid = pn532.read_passive_target(timeout=0.1)
        if uid:
            print(f" FOUND: {[hex(i) for i in uid]}")
            break
        else:
            print(" no tag")
    except Exception as e:
        print(f" ERROR: {e}")
    
    time.sleep(0.5)
    
    # Test 3: Timeout as integer milliseconds
    print("Test 3: Timeout 100 (ms)...", end='', flush=True)
    try:
        uid = pn532.read_passive_target(timeout=100)
        if uid:
            print(f" FOUND: {[hex(i) for i in uid]}")
            break
        else:
            print(" no tag")
    except Exception as e:
        print(f" ERROR: {e}")
    
    time.sleep(0.5)
    
    # Test 4: No timeout parameter
    print("Test 4: No timeout...", end='', flush=True)
    try:
        uid = pn532.read_passive_target()
        if uid:
            print(f" FOUND: {[hex(i) for i in uid]}")
            break
        else:
            print(" no tag")
    except Exception as e:
        print(f" ERROR: {e}")
    
    print("---")
    time.sleep(1)

print("\nTag detected! Testing read capabilities...")

# Try to read some data
try:
    for page in range(4, 8):
        data = pn532.ntag2xx_read_block(page)
        if data:
            print(f"Page {page}: {[hex(i) for i in data]}")
        else:
            print(f"Page {page}: Failed to read")
except Exception as e:
    print(f"Error reading data: {e}")