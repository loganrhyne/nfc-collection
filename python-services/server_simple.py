#!/usr/bin/env python3
"""
Simple WebSocket server for NFC reading - debug version
"""

import asyncio
import logging
from datetime import datetime
import socketio
from aiohttp import web

# Use the simple NFC service
from services.nfc_service_simple import NFCServiceSimple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Socket.IO server
sio = socketio.AsyncServer(
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=False  # Less verbose
)

# Create aiohttp app
app = web.Application()
sio.attach(app)

# Initialize NFC service
nfc_service = NFCServiceSimple()

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    await sio.emit('connection_status', {
        'connected': True,
        'nfc_available': nfc_service.pn532 is not None
    }, room=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

async def handle_tag_scanned(tag_data):
    """Handle scanned tag data"""
    logger.info(f"Tag scanned with data: {tag_data}")
    
    # Emit to all connected clients
    await sio.emit('tag_scanned', {
        'entry_id': tag_data.get('id'),
        'tag_data': tag_data
    })

async def on_startup(app):
    """Run on server startup"""
    if nfc_service.pn532:
        logger.info("Starting NFC scanning background task")
        await nfc_service.start_continuous_scanning(handle_tag_scanned)
    else:
        logger.error("No NFC hardware detected!")

async def on_cleanup(app):
    """Run on server shutdown"""
    nfc_service.stop_scanning()

if __name__ == '__main__':
    port = 8765
    logger.info(f"Starting simple WebSocket server on port {port}")
    
    app.on_startup.append(on_startup)
    app.on_cleanup.append(on_cleanup)
    
    web.run_app(app, host='0.0.0.0', port=port)