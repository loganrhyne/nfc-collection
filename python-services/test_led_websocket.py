#!/usr/bin/env python3
"""
Test script to verify LED WebSocket integration
"""

import asyncio
import json
import socketio

# Create a Socket.IO client
sio = socketio.AsyncClient()

@sio.event
async def connect():
    print("Connected to WebSocket server")
    
    # Test setting a selected LED
    await sio.emit('led_update', {
        'command': 'set_selected',
        'index': 5,
        'color': '#E6C200'  # Beach color
    })
    print("Sent LED update for index 5")
    
    # Wait a moment
    await asyncio.sleep(2)
    
    # Clear selection
    await sio.emit('led_update', {
        'command': 'set_selected',
        'index': None
    })
    print("Cleared LED selection")
    
    # Test clear all
    await asyncio.sleep(1)
    await sio.emit('led_update', {
        'command': 'clear_all'
    })
    print("Cleared all LEDs")

@sio.event
async def led_status(data):
    print(f"LED Status Response: {json.dumps(data, indent=2)}")

@sio.event
async def disconnect():
    print("Disconnected from server")

async def main():
    try:
        # Connect to the server
        await sio.connect('http://localhost:8765')
        
        # Wait for events to process
        await asyncio.sleep(5)
        
        # Disconnect
        await sio.disconnect()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())