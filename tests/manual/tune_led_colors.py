#!/usr/bin/env python3
"""
Interactive LED color tuning utility
Allows real-time adjustment of LED colors to find optimal values
"""

import sys
import time
import json
import asyncio
import socketio
from typing import Dict, Tuple

# Add parent directory to path for imports
sys.path.append('../../python-services')

from services.led_controller import get_led_controller
from services.led_colors import LED_COLORS, UI_COLORS

# Current color being tuned
current_type = 'Mountain'
current_rgb = list(LED_COLORS[current_type]['rgb'])
brightness = 0.5

def rgb_to_hex(rgb: Tuple[int, int, int]) -> str:
    """Convert RGB tuple to hex string"""
    return '#{:02x}{:02x}{:02x}'.format(*rgb)

def print_menu():
    """Display the color tuning menu"""
    print("\n" + "="*50)
    print("LED Color Tuning Utility")
    print("="*50)
    print(f"\nCurrent Type: {current_type}")
    print(f"UI Color: {UI_COLORS[current_type]}")
    print(f"Current LED RGB: {tuple(current_rgb)} -> {rgb_to_hex(current_rgb)}")
    print(f"Brightness: {brightness:.1f}")
    print("\nCommands:")
    print("  1-5: Select type (1=Beach, 2=Desert, 3=Lake, 4=Mountain, 5=River)")
    print("  r/R: Decrease/Increase RED (-/+ 10)")
    print("  g/G: Decrease/Increase GREEN (-/+ 10)")
    print("  b/B: Decrease/Increase BLUE (-/+ 10)")
    print("  -/+: Adjust brightness")
    print("  s: Save current colors to config")
    print("  q: Quit")
    print()

async def update_led():
    """Update the LED with current color"""
    controller = get_led_controller()
    
    # Clear all first
    await controller.clear_all()
    
    # Set center LED (index 75 for 10x15 grid)
    center_index = 75
    hex_color = rgb_to_hex(current_rgb)
    await controller.set_pixel(center_index, hex_color, brightness)
    
    # Also light up surrounding pixels for better visibility
    surrounding = [74, 76, 60, 90]  # Left, right, above, below
    for idx in surrounding:
        await controller.set_pixel(idx, hex_color, brightness * 0.3)

async def save_colors():
    """Save current colors to a new config file"""
    output = {
        'LED_COLORS': {},
        'notes': f'Tuned on {time.strftime("%Y-%m-%d %H:%M:%S")}'
    }
    
    # Copy all current colors
    for type_name, colors in LED_COLORS.items():
        if type_name == current_type:
            # Use the tuned color
            output['LED_COLORS'][type_name] = {
                'hex': rgb_to_hex(current_rgb),
                'rgb': tuple(current_rgb),
                'description': colors['description']
            }
        else:
            # Use existing color
            output['LED_COLORS'][type_name] = colors
    
    filename = f'led_colors_tuned_{int(time.time())}.json'
    with open(filename, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\nColors saved to: {filename}")
    print("To apply these colors, update python-services/services/led_colors.py")

async def main():
    """Main tuning loop"""
    global current_type, current_rgb, brightness
    
    controller = get_led_controller()
    print(f"LED Controller initialized - Hardware mode: {controller.hardware_available}")
    
    # Initial display
    await update_led()
    
    while True:
        print_menu()
        
        try:
            cmd = input("Command: ").strip().lower()
            
            if cmd == 'q':
                await controller.clear_all()
                break
            
            elif cmd in '12345':
                # Switch type
                types = list(LED_COLORS.keys())
                idx = int(cmd) - 1
                if 0 <= idx < len(types):
                    current_type = types[idx]
                    current_rgb = list(LED_COLORS[current_type]['rgb'])
                    await update_led()
            
            elif cmd == 'r':
                current_rgb[0] = max(0, current_rgb[0] - 10)
                await update_led()
            elif cmd == 'R':
                current_rgb[0] = min(255, current_rgb[0] + 10)
                await update_led()
            
            elif cmd == 'g':
                current_rgb[1] = max(0, current_rgb[1] - 10)
                await update_led()
            elif cmd == 'G':
                current_rgb[1] = min(255, current_rgb[1] + 10)
                await update_led()
            
            elif cmd == 'b':
                current_rgb[2] = max(0, current_rgb[2] - 10)
                await update_led()
            elif cmd == 'B':
                current_rgb[2] = min(255, current_rgb[2] + 10)
                await update_led()
            
            elif cmd == '-':
                brightness = max(0.1, brightness - 0.1)
                await update_led()
            elif cmd == '+':
                brightness = min(1.0, brightness + 0.1)
                await update_led()
            
            elif cmd == 's':
                await save_colors()
            
            else:
                print("Invalid command. Try again.")
        
        except KeyboardInterrupt:
            await controller.clear_all()
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    print("Starting LED Color Tuning Utility...")
    print("Make sure the WebSocket server is running!")
    asyncio.run(main())