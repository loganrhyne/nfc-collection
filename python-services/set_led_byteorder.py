#!/usr/bin/env python3
"""
Quick script to change LED byte order
"""

import sys
import re

if len(sys.argv) != 2 or sys.argv[1].upper() not in ['RGB', 'RBG', 'GRB', 'GBR', 'BRG', 'BGR']:
    print("Usage: python set_led_byteorder.py [RGB|RBG|GRB|GBR|BRG|BGR]")
    print("\nCommon byte orders:")
    print("  GRB - Most WS2812B LEDs (current)")
    print("  RGB - Standard RGB order")
    print("  BGR - Previous setting")
    sys.exit(1)

new_order = sys.argv[1].upper()

# Read the file
with open('services/led_controller.py', 'r') as f:
    content = f.read()

# Replace the byteorder
pattern = r'byteorder="[A-Z]{3}"'
replacement = f'byteorder="{new_order}"'
new_content = re.sub(pattern, replacement, content)

# Write back
with open('services/led_controller.py', 'w') as f:
    f.write(new_content)

print(f"Changed byte order to: {new_order}")
print("Restart the service with: sudo systemctl restart nfc-websocket")