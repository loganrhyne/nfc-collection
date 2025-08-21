#!/usr/bin/env python3
"""
Test script to simulate NFC tag scanning
"""

import asyncio
import socketio

sio = socketio.AsyncClient()

async def test_scanning():
    """Test the scanning functionality"""
    
    # Connect to server
    await sio.connect('http://localhost:8765')
    print("Connected to WebSocket server")
    
    # Listen for tag_scanned events
    @sio.event
    async def tag_scanned(data):
        print(f"Tag scanned event received: {data}")
    
    # Wait for connection
    await asyncio.sleep(1)
    
    print("\nThe server is now continuously scanning for NFC tags.")
    print("In mock mode, it will simulate a tag scan every 5 seconds.")
    print("Watch for 'tag_scanned' events...")
    print("Press Ctrl+C to stop\n")
    
    try:
        # Keep running to receive events
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping...")
    
    # Disconnect
    await sio.disconnect()
    print("Disconnected from server")

if __name__ == "__main__":
    asyncio.run(test_scanning())