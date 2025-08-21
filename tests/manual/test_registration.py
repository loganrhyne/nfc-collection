#!/usr/bin/env python3
"""
Test script to simulate NFC tag registration flow
"""

import asyncio
import socketio
import json

sio = socketio.AsyncClient()

async def test_nfc_registration():
    """Simulate NFC tag registration flow"""
    
    # Connect to server
    await sio.connect('http://localhost:8765')
    print("Connected to WebSocket server")
    
    # Listen for awaiting_tag event
    @sio.event
    async def awaiting_tag(data):
        print(f"Server is awaiting tag: {data}")
        
        # Simulate placing a tag after 2 seconds
        await asyncio.sleep(2)
        
        # Simulate tag detection
        print("Simulating tag detected...")
        await sio.emit('tag_detected', {
            'uid': '01234567',
            'type': 'NTAG213'
        })
    
    @sio.event
    async def tag_write_progress(data):
        print(f"Tag write progress: {data}")
    
    @sio.event
    async def tag_registered(data):
        print(f"Tag successfully registered: {data}")
        print("\nTag data written:")
        if 'written_data' in data.get('data', {}):
            print(json.dumps(data['data']['written_data'], indent=2))
    
    @sio.event
    async def error(data):
        print(f"Error: {data}")
    
    # Wait for connection
    await asyncio.sleep(1)
    
    # Simulate a registration request
    print("\nSimulating tag registration request...")
    await sio.emit('register_tag_start', {
        'entry_id': '1A88256FB33855EEB831ED2569B135CF',
        'entry_data': {
            'coordinates': [-33.890542, 151.274856],
            'timestamp': '2024-01-15T10:30:00Z'
        }
    })
    
    # Keep running for a bit to see results
    await asyncio.sleep(10)
    
    # Disconnect
    await sio.disconnect()
    print("\nDisconnected from server")

if __name__ == "__main__":
    asyncio.run(test_nfc_registration())