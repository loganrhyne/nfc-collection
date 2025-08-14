#!/usr/bin/env python3
"""
Debug script to read and parse NFC tag data
"""

import board
import busio
from digitalio import DigitalInOut
from adafruit_pn532.spi import PN532_SPI
import json

print("Initializing NFC reader...")

# Initialize PN532
spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
cs_pin = DigitalInOut(board.D25)
pn532 = PN532_SPI(spi, cs_pin, debug=False)

# Configure
pn532.SAM_configuration()

print("Place tag on reader...\n")

# Wait for tag
uid = None
while not uid:
    uid = pn532.read_passive_target()

print(f"Tag detected: {':'.join([f'{b:02X}' for b in uid])}")

# Read all user pages
print("\nReading tag data...")
data = bytearray()
for page in range(4, 40):
    block = pn532.ntag2xx_read_block(page)
    if block:
        data.extend(block)
        print(f"Page {page}: {' '.join([f'{b:02X}' for b in block])}")
    else:
        print(f"Page {page}: Failed to read")
        break

print(f"\nTotal data read: {len(data)} bytes")
print(f"First 32 bytes (hex): {data[:32].hex()}")
print(f"First 32 bytes (raw): {data[:32]}")

# Try to parse NDEF
print("\n--- NDEF Parsing ---")
if len(data) > 2 and data[0] == 0x03:
    print("Found NDEF TLV (0x03)")
    
    # Get length
    if data[1] == 0xFF:
        ndef_len = (data[2] << 8) | data[3]
        ndef_start = 4
        print(f"Long format length: {ndef_len} bytes")
    else:
        ndef_len = data[1]
        ndef_start = 2
        print(f"Short format length: {ndef_len} bytes")
    
    print(f"NDEF message starts at byte {ndef_start}")
    
    if len(data) >= ndef_start + 5:
        # Parse NDEF record header
        flags = data[ndef_start]
        type_len = data[ndef_start + 1]
        payload_len = data[ndef_start + 2]
        type_field = data[ndef_start + 3]
        
        print(f"NDEF Record Header:")
        print(f"  Flags: 0x{flags:02X}")
        print(f"  Type Length: {type_len}")
        print(f"  Payload Length: {payload_len}")
        print(f"  Type: 0x{type_field:02X} ({chr(type_field) if 32 <= type_field <= 126 else '?'})")
        
        if type_field == ord('T'):  # Text record
            print("  This is a Text record")
            
            # Text record payload starts after header
            payload_start = ndef_start + 4
            if len(data) > payload_start:
                status_byte = data[payload_start]
                lang_len = status_byte & 0x3F
                print(f"  Status byte: 0x{status_byte:02X}")
                print(f"  Language code length: {lang_len}")
                
                if len(data) > payload_start + 1 + lang_len:
                    lang_code = data[payload_start + 1:payload_start + 1 + lang_len]
                    print(f"  Language: {lang_code.decode('ascii', errors='ignore')}")
                    
                    text_start = payload_start + 1 + lang_len
                    text_end = payload_start + payload_len
                    
                    if len(data) >= text_end:
                        text_data = data[text_start:text_end]
                        print(f"\nText content ({len(text_data)} bytes):")
                        print(text_data.decode('utf-8', errors='ignore'))
                        
                        # Try to parse as JSON
                        try:
                            json_obj = json.loads(text_data.decode('utf-8'))
                            print("\nParsed JSON:")
                            print(json.dumps(json_obj, indent=2))
                        except:
                            print("Could not parse as JSON")

# Also look for raw JSON
print("\n--- Raw JSON Search ---")
if b'{' in data:
    start = data.find(b'{')
    end = data.find(b'}', start) + 1
    if end > start:
        json_str = data[start:end].decode('utf-8', errors='ignore')
        print(f"Found JSON at byte {start}: {json_str}")
        try:
            json_obj = json.loads(json_str)
            print("Parsed successfully!")
        except:
            print("Failed to parse")