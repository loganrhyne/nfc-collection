#!/usr/bin/env python3
"""
WebSocket server for NFC communication
MVP: Handle tag registration from React app
"""

import asyncio
import json
import logging
from datetime import datetime
import socketio
from aiohttp import web

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Socket.IO server
sio = socketio.AsyncServer(
    cors_allowed_origins='*',  # Allow all origins for development
    logger=True,
    engineio_logger=True
)

# Create aiohttp app
app = web.Application()
sio.attach(app)

# Store active registration sessions
registration_sessions = {}

# Import NFC service (we'll create this next)
try:
    from services.nfc_service import NFCService
    nfc_service = NFCService()
    nfc_available = True
except Exception as e:
    logger.warning(f"NFC service not available: {e}")
    nfc_service = None
    nfc_available = False

@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    logger.info(f"Client connected: {sid}")
    # Send connection status
    await sio.emit('connection_status', {
        'connected': True,
        'nfc_available': nfc_available
    }, room=sid)

@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f"Client disconnected: {sid}")
    # Clean up any active registration sessions
    if sid in registration_sessions:
        del registration_sessions[sid]

@sio.event
async def register_tag_start(sid, data):
    """Start NFC tag registration process"""
    logger.info(f"Starting tag registration for client {sid}: {data}")
    
    entry_id = data.get('entry_id')
    entry_data = data.get('entry_data', {})
    
    if not entry_id:
        await sio.emit('error', {
            'code': 'INVALID_REQUEST',
            'message': 'entry_id is required'
        }, room=sid)
        return
    
    # Store registration session
    registration_sessions[sid] = {
        'entry_id': entry_id,
        'entry_data': entry_data,
        'started_at': datetime.utcnow().isoformat()
    }
    
    # Send acknowledgment
    await sio.emit('awaiting_tag', {
        'message': 'Place NFC tag on reader',
        'timeout': 30
    }, room=sid)
    
    # Start tag detection if NFC is available
    if nfc_service:
        asyncio.create_task(wait_for_tag(sid))
    else:
        # Simulate for development
        asyncio.create_task(simulate_tag_write(sid))

async def wait_for_tag(sid):
    """Wait for NFC tag and write data"""
    if sid not in registration_sessions:
        return
    
    session = registration_sessions[sid]
    
    try:
        # Wait for tag (timeout 30 seconds)
        tag_uid = await nfc_service.wait_for_tag(timeout=30)
        
        if not tag_uid:
            await sio.emit('error', {
                'code': 'TIMEOUT',
                'message': 'No tag detected within timeout period'
            }, room=sid)
            return
        
        # Prepare NDEF data
        entry_data = session['entry_data']
        ndef_payload = {
            'v': 1,  # Version
            'id': session['entry_id'],
            'geo': entry_data.get('coordinates', [0, 0]),
            'ts': int(datetime.fromisoformat(entry_data.get('timestamp', datetime.utcnow().isoformat())).timestamp())
        }
        
        # Send progress update
        await sio.emit('tag_write_progress', {
            'progress': 25,
            'message': 'Tag detected, preparing data...'
        }, room=sid)
        
        # Write to tag
        success = await nfc_service.write_json_to_tag(tag_uid, ndef_payload)
        
        if success:
            await sio.emit('tag_registered', {
                'success': True,
                'tag_uid': tag_uid,
                'entry_id': session['entry_id'],
                'ndef_data': ndef_payload
            }, room=sid)
        else:
            await sio.emit('error', {
                'code': 'WRITE_FAILED',
                'message': 'Failed to write data to tag'
            }, room=sid)
            
    except Exception as e:
        logger.error(f"Error in tag registration: {e}")
        await sio.emit('error', {
            'code': 'REGISTRATION_ERROR',
            'message': str(e)
        }, room=sid)
    finally:
        # Clean up session
        if sid in registration_sessions:
            del registration_sessions[sid]

async def simulate_tag_write(sid):
    """Simulate tag writing for development"""
    if sid not in registration_sessions:
        return
    
    await asyncio.sleep(2)  # Simulate detection delay
    
    # Send progress updates
    await sio.emit('tag_write_progress', {
        'progress': 50,
        'message': 'Writing data to tag...'
    }, room=sid)
    
    await asyncio.sleep(1)
    
    await sio.emit('tag_write_progress', {
        'progress': 75,
        'message': 'Verifying write...'
    }, room=sid)
    
    await asyncio.sleep(1)
    
    # Send success
    session = registration_sessions.get(sid, {})
    await sio.emit('tag_registered', {
        'success': True,
        'tag_uid': '04:11:5D:22:2C:65:80',  # Mock UID
        'entry_id': session.get('entry_id'),
        'ndef_data': {
            'v': 1,
            'id': session.get('entry_id'),
            'geo': session.get('entry_data', {}).get('coordinates', [0, 0]),
            'ts': int(datetime.utcnow().timestamp())
        }
    }, room=sid)
    
    # Clean up
    if sid in registration_sessions:
        del registration_sessions[sid]

@sio.event
async def register_tag_cancel(sid, data):
    """Cancel ongoing registration"""
    logger.info(f"Cancelling registration for client {sid}")
    if sid in registration_sessions:
        del registration_sessions[sid]
    if nfc_service:
        nfc_service.cancel_registration()

if __name__ == '__main__':
    port = 8765
    logger.info(f"Starting WebSocket server on port {port}")
    web.run_app(app, host='0.0.0.0', port=port)