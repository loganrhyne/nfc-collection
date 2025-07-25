#!/usr/bin/env python3
"""
Simple NFC Reader - Minimal version for quick testing
Reads tags and opens URIs automatically
"""

import board
import busio
from digitalio import DigitalInOut
from adafruit_pn532.spi import PN532_SPI
import time
import webbrowser

# Initialize PN532
spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
cs_pin = DigitalInOut(board.D25)
pn532 = PN532_SPI(spi, cs_pin, debug=False)

# Check firmware
ic, ver, rev, support = pn532.firmware_version
print(f"PN532 Firmware Version: {ver}.{rev}")

# Configure
pn532.SAM_configuration()

print("\n🔍 Simple NFC Reader")
print("=" * 30)
print("Place tag near reader...")
print("Press Ctrl+C to exit\n")

last_uid = None
last_read_time = 0

try:
    while True:
        # Check for tag
        uid = pn532.read_passive_target(timeout=0.1)
        
        if uid:
            # Debounce - ignore same tag for 3 seconds
            current_time = time.time()
            if uid != last_uid or current_time - last_read_time > 3:
                last_uid = uid
                last_read_time = current_time
                
                print(f"\n📱 Tag found: {[hex(i) for i in uid]}")
                
                # Read NDEF data
                try:
                    # Read pages 4-10 (should be enough for URI)
                    data = bytearray()
                    for page in range(4, 11):
                        block = pn532.ntag2xx_read_block(page)
                        if block:
                            data.extend(block)
                    
                    # Quick and dirty URI extraction
                    # Look for URI record marker (0x55 = 'U')
                    if b'U' in data:
                        uri_start = data.find(b'U') + 2  # Skip 'U' and prefix byte
                        
                        # Find end (0xFE terminator or end of valid chars)
                        uri_end = uri_start
                        while uri_end < len(data) and data[uri_end] >= 32 and data[uri_end] != 0xFE:
                            uri_end += 1
                        
                        if uri_end > uri_start:
                            uri = data[uri_start:uri_end].decode('utf-8', errors='ignore')
                            print(f"📎 URI: {uri}")
                            
                            # Open in browser
                            print("🌐 Opening browser...")
                            webbrowser.open(uri)
                        else:
                            print("❌ No valid URI found")
                    else:
                        print("❌ No URI record found")
                        
                except Exception as e:
                    print(f"❌ Error reading tag: {e}")
        
        # Low-power delay
        time.sleep(0.5)
        
except KeyboardInterrupt:
    print("\n\n👋 Reader stopped")
