#!/usr/bin/env python3
"""
Simplified WebSocket Server
Handles client connections and communicates with hardware service via Unix socket
"""

import asyncio
import json
import logging
import os
import signal
import sys
from datetime import datetime
from typing import Optional, Dict, Any, Set
from pathlib import Path

import socketio
from aiohttp import web
from aiohttp_cors import setup as cors_setup, ResourceOptions

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class WebSocketServer:
    """Simplified WebSocket server that delegates hardware to external service"""

    def __init__(self, port: int = 8000, hardware_socket: str = "/tmp/nfc-hardware.sock"):
        self.port = port
        self.hardware_socket = hardware_socket
        self.hardware_connected = False
        self.hardware_reader: Optional[asyncio.StreamReader] = None
        self.hardware_writer: Optional[asyncio.StreamWriter] = None

        # Initialize Socket.IO server
        self.sio = socketio.AsyncServer(
            async_mode='aiohttp',
            cors_allowed_origins='*',  # Configure properly for production
            logger=logger,
            engineio_logger=False
        )

        # Initialize aiohttp app
        self.app = web.Application()
        self.sio.attach(self.app)

        # Setup CORS
        cors = cors_setup(self.app, defaults={
            "*": ResourceOptions(
                allow_credentials=True,
                expose_headers="*",
                allow_headers="*",
                allow_methods="*"
            )
        })

        # Setup routes
        self.setup_routes()

        # Setup Socket.IO handlers
        self.setup_socketio_handlers()

        # Connected clients
        self.clients: Set[str] = set()

    def setup_routes(self):
        """Setup HTTP routes"""

        async def health_check(request):
            """Health check endpoint"""
            return web.json_response({
                'status': 'healthy',
                'hardware_connected': self.hardware_connected,
                'clients_connected': len(self.clients),
                'timestamp': datetime.utcnow().isoformat()
            })

        async def api_status(request):
            """API status endpoint"""
            hardware_status = await self.get_hardware_status()
            return web.json_response({
                'websocket_server': 'running',
                'hardware_service': hardware_status,
                'connected_clients': len(self.clients)
            })

        # Add routes
        self.app.router.add_get('/health', health_check)
        self.app.router.add_get('/api/status', api_status)

    def setup_socketio_handlers(self):
        """Setup Socket.IO event handlers"""

        @self.sio.event
        async def connect(sid, environ):
            """Handle client connection"""
            self.clients.add(sid)
            logger.info(f"Client connected: {sid}")

            # Send initial status
            await self.sio.emit('connected', {
                'message': 'Connected to NFC WebSocket server',
                'hardware_available': self.hardware_connected
            }, to=sid)

            # Notify hardware status
            if self.hardware_connected:
                await self.sio.emit('hardware_status', {
                    'connected': True,
                    'message': 'NFC hardware available'
                }, to=sid)

        @self.sio.event
        async def disconnect(sid):
            """Handle client disconnection"""
            self.clients.discard(sid)
            logger.info(f"Client disconnected: {sid}")

        @self.sio.event
        async def ping(sid):
            """Handle ping from client"""
            await self.sio.emit('pong', {'timestamp': datetime.utcnow().isoformat()}, to=sid)

        @self.sio.event
        async def register_tag(sid, data):
            """Handle tag registration request"""
            logger.info(f"Register tag request from {sid}: {data}")

            if not self.hardware_connected:
                await self.sio.emit('error', {
                    'message': 'Hardware service not connected'
                }, to=sid)
                return

            # Forward to hardware service
            success = await self.send_hardware_command({
                'command': 'write_tag',
                'data': data
            })

            if success:
                await self.sio.emit('registration_complete', {
                    'success': True,
                    'entry_id': data.get('entry_id')
                }, to=sid)
            else:
                await self.sio.emit('registration_failed', {
                    'message': 'Failed to write to tag'
                }, to=sid)

        @self.sio.event
        async def set_led_mode(sid, data):
            """Handle LED mode change request"""
            logger.info(f"LED mode request from {sid}: {data}")

            if not self.hardware_connected:
                return

            await self.send_hardware_command({
                'command': 'set_led',
                'mode': data.get('mode', 'idle'),
                'params': data.get('params', {})
            })

    async def connect_to_hardware(self):
        """Connect to hardware service via Unix socket"""
        max_retries = 5
        retry_delay = 2

        for attempt in range(max_retries):
            try:
                logger.info(f"Connecting to hardware service (attempt {attempt + 1}/{max_retries})...")

                self.hardware_reader, self.hardware_writer = await asyncio.open_unix_connection(
                    self.hardware_socket
                )

                self.hardware_connected = True
                logger.info("Connected to hardware service")

                # Notify all clients
                await self.sio.emit('hardware_status', {
                    'connected': True,
                    'message': 'NFC hardware connected'
                })

                return True

            except (FileNotFoundError, ConnectionRefusedError) as e:
                logger.warning(f"Hardware service not available: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 1.5  # Exponential backoff
            except Exception as e:
                logger.error(f"Error connecting to hardware service: {e}")
                break

        logger.warning("Could not connect to hardware service - running without hardware")
        self.hardware_connected = False
        return False

    async def hardware_reader_task(self):
        """Read events from hardware service"""
        while self.hardware_connected:
            try:
                if not self.hardware_reader:
                    break

                data = await self.hardware_reader.readline()
                if not data:
                    logger.warning("Hardware service disconnected")
                    self.hardware_connected = False
                    break

                try:
                    message = json.loads(data.decode())
                    await self.handle_hardware_event(message)
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON from hardware service: {data}")

            except Exception as e:
                logger.error(f"Hardware reader error: {e}")
                self.hardware_connected = False
                break

        # Try to reconnect
        if not self.hardware_connected:
            await self.sio.emit('hardware_status', {
                'connected': False,
                'message': 'NFC hardware disconnected'
            })
            await asyncio.sleep(5)
            await self.connect_to_hardware()

    async def handle_hardware_event(self, message: Dict[str, Any]):
        """Handle events from hardware service"""
        event = message.get('event')

        if event == 'tag_detected':
            tag_id = message.get('tag_id')
            logger.info(f"Tag detected: {tag_id}")

            # For now, map tag_id to entry_id (in real app, would query database)
            entry_id = f"entry_{tag_id[:8]}"

            # Broadcast to all clients
            await self.sio.emit('tag_scanned', {
                'entry_id': entry_id,
                'tag_id': tag_id,
                'timestamp': datetime.utcnow().isoformat()
            })

    async def send_hardware_command(self, command: Dict[str, Any]) -> bool:
        """Send command to hardware service"""
        if not self.hardware_connected or not self.hardware_writer:
            return False

        try:
            message = json.dumps(command).encode() + b'\n'
            self.hardware_writer.write(message)
            await self.hardware_writer.drain()

            # Read response
            if self.hardware_reader:
                data = await self.hardware_reader.readline()
                response = json.loads(data.decode())
                return response.get('status') == 'ok'

        except Exception as e:
            logger.error(f"Error sending hardware command: {e}")
            self.hardware_connected = False

        return False

    async def get_hardware_status(self) -> Dict[str, Any]:
        """Get status from hardware service"""
        if not self.hardware_connected:
            return {'connected': False}

        if await self.send_hardware_command({'command': 'status'}):
            # Read the response
            if self.hardware_reader:
                data = await self.hardware_reader.readline()
                return json.loads(data.decode())

        return {'connected': False}

    async def startup_task(self):
        """Startup tasks"""
        # Connect to hardware service
        await self.connect_to_hardware()

        # Start hardware reader task
        if self.hardware_connected:
            asyncio.create_task(self.hardware_reader_task())

    async def cleanup_task(self):
        """Cleanup tasks"""
        logger.info("Shutting down WebSocket server")

        # Close hardware connection
        if self.hardware_writer:
            self.hardware_writer.close()
            await self.hardware_writer.wait_closed()

        # Notify clients
        await self.sio.emit('server_shutdown', {
            'message': 'Server is shutting down'
        })

    def run(self):
        """Run the WebSocket server"""
        # Setup startup/cleanup handlers
        self.app.on_startup.append(lambda app: self.startup_task())
        self.app.on_cleanup.append(lambda app: self.cleanup_task())

        # Run the app
        logger.info(f"Starting WebSocket server on port {self.port}")
        web.run_app(
            self.app,
            host='0.0.0.0',
            port=self.port,
            access_log=logger.getChild('access')
        )


def main():
    """Main entry point"""
    # Get configuration from environment
    port = int(os.getenv('WS_PORT', '8000'))
    hardware_socket = os.getenv('HARDWARE_SOCKET', '/tmp/nfc-hardware.sock')

    # Create and run server
    server = WebSocketServer(port=port, hardware_socket=hardware_socket)

    # Handle shutdown signals
    def signal_handler(sig, frame):
        logger.info(f"Received signal {sig}, shutting down...")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        server.run()
    except Exception as e:
        logger.error(f"Server error: {e}")
        return 1

    return 0


if __name__ == '__main__':
    sys.exit(main())