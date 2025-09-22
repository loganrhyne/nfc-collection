#!/usr/bin/env python3
"""
Clean, single WebSocket server with integrated NFC hardware support
"""

import asyncio
import json
import logging
import os
import signal
import sys
from datetime import datetime
from typing import Optional, Dict, Any, Set

import socketio
from aiohttp import web
from aiohttp_cors import setup as cors_setup, ResourceOptions

# Hardware imports - optional for development
try:
    import board
    import busio
    from digitalio import DigitalInOut
    from adafruit_pn532.spi import PN532_SPI
    from adafruit_pn532.i2c import PN532_I2C
    HARDWARE_AVAILABLE = True
except ImportError:
    HARDWARE_AVAILABLE = False
    print("Hardware libraries not available - running in development mode")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class NFCHandler:
    """Handles NFC hardware operations"""

    def __init__(self):
        self.pn532 = None
        self.last_tag_id = None
        self.last_scan_time = 0
        self.mock_mode = not HARDWARE_AVAILABLE or os.getenv('NFC_MOCK_MODE', 'false').lower() == 'true'

        if not self.mock_mode:
            self._initialize_hardware()

    def _initialize_hardware(self):
        """Initialize NFC hardware with retries"""
        max_attempts = 3

        for attempt in range(max_attempts):
            try:
                logger.info(f"Initializing NFC hardware (attempt {attempt + 1}/{max_attempts})")

                # Try SPI first (most common on Pi)
                try:
                    spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
                    cs_pin = DigitalInOut(board.D25)  # GPIO 25
                    self.pn532 = PN532_SPI(spi, cs_pin, debug=False)
                    logger.info("Connected via SPI")
                except Exception as e:
                    logger.debug(f"SPI failed: {e}, trying I2C...")

                    # Fallback to I2C
                    i2c = busio.I2C(board.SCL, board.SDA)
                    self.pn532 = PN532_I2C(i2c, debug=False)
                    logger.info("Connected via I2C")

                # Verify connection
                ic, ver, rev, support = self.pn532.firmware_version
                logger.info(f"Found PN532 - Firmware {ver}.{rev}")

                # Configure for passive reading
                self.pn532.SAM_configuration()
                return

            except Exception as e:
                logger.warning(f"Hardware init attempt {attempt + 1} failed: {e}")
                if attempt < max_attempts - 1:
                    # Release GPIO and retry
                    asyncio.sleep(1)

        logger.error("Failed to initialize NFC hardware - running in mock mode")
        self.mock_mode = True

    async def scan_for_tag(self) -> Optional[str]:
        """Scan for NFC tag"""
        if self.mock_mode:
            return None

        try:
            uid = self.pn532.read_passive_target(timeout=0.2)
            if uid:
                tag_id = uid.hex()
                current_time = asyncio.get_event_loop().time()

                # Simple debounce - 3 seconds
                if tag_id != self.last_tag_id or (current_time - self.last_scan_time) > 3:
                    self.last_tag_id = tag_id
                    self.last_scan_time = current_time
                    return tag_id
        except Exception as e:
            logger.error(f"NFC scan error: {e}")

        return None


class WebSocketServer:
    """Main server handling WebSocket connections and NFC scanning"""

    def __init__(self, port: int = 8000):
        self.port = port
        self.nfc = NFCHandler()
        self.clients: Set[str] = set()
        self.scanning = True

        # Socket.IO setup
        self.sio = socketio.AsyncServer(
            async_mode='aiohttp',
            cors_allowed_origins='*',
            logger=False
        )

        # aiohttp app
        self.app = web.Application()
        self.sio.attach(self.app)

        # CORS setup
        cors_setup(self.app, defaults={
            "*": ResourceOptions(
                allow_credentials=True,
                expose_headers="*",
                allow_headers="*"
            )
        })

        # Routes
        self.setup_routes()
        self.setup_socketio_handlers()

    def setup_routes(self):
        """HTTP routes"""

        async def health(request):
            return web.json_response({
                'status': 'healthy',
                'hardware_available': not self.nfc.mock_mode,
                'clients': len(self.clients),
                'timestamp': datetime.utcnow().isoformat()
            })

        self.app.router.add_get('/health', health)

    def setup_socketio_handlers(self):
        """Socket.IO event handlers"""

        @self.sio.event
        async def connect(sid, environ):
            self.clients.add(sid)
            logger.info(f"Client connected: {sid}")

            await self.sio.emit('connected', {
                'message': 'Connected to NFC server',
                'hardware_available': not self.nfc.mock_mode
            }, to=sid)

            # Send initial scanner status
            await self.sio.emit('scanner_status', {
                'connected': not self.nfc.mock_mode,
                'scanning': self.scanning
            }, to=sid)

        @self.sio.event
        async def disconnect(sid):
            self.clients.discard(sid)
            logger.info(f"Client disconnected: {sid}")

        @self.sio.event
        async def ping(sid):
            await self.sio.emit('pong', {
                'timestamp': datetime.utcnow().isoformat()
            }, to=sid)

        @self.sio.event
        async def start_registration(sid, data):
            """Handle tag registration request"""
            entry_id = data.get('entry_id')
            logger.info(f"Registration requested for entry {entry_id}")

            # In production, would write entry_id to tag
            # For now, just simulate success after next scan
            await self.sio.emit('registration_started', {
                'entry_id': entry_id
            }, to=sid)

        @self.sio.event
        async def cancel_registration(sid):
            logger.info("Registration cancelled")
            await self.sio.emit('registration_cancelled', {}, to=sid)

    async def nfc_scan_loop(self):
        """Background task to scan for NFC tags"""
        logger.info("Starting NFC scan loop")

        while self.scanning:
            try:
                tag_id = await self.nfc.scan_for_tag()

                if tag_id:
                    logger.info(f"Tag detected: {tag_id}")

                    # Map tag to entry (in production, would query database)
                    entry_id = f"entry_{tag_id[:8]}"

                    # Emit to all clients
                    await self.sio.emit('tag_scanned', {
                        'entry_id': entry_id,
                        'tag_data': {'tag_id': tag_id},
                        'timestamp': datetime.utcnow().isoformat()
                    })

                await asyncio.sleep(0.5)

            except Exception as e:
                logger.error(f"Scan loop error: {e}")
                await asyncio.sleep(1)

    async def startup(self, app):
        """Startup tasks"""
        logger.info("Starting NFC scan loop")
        self.scan_task = asyncio.create_task(self.nfc_scan_loop())

    async def cleanup(self, app):
        """Cleanup tasks"""
        logger.info("Stopping NFC scan loop")
        self.scanning = False
        if hasattr(self, 'scan_task'):
            self.scan_task.cancel()

    def run(self):
        """Run the server"""
        self.app.on_startup.append(self.startup)
        self.app.on_cleanup.append(self.cleanup)

        logger.info(f"Starting server on port {self.port}")
        logger.info(f"NFC mode: {'mock' if self.nfc.mock_mode else 'hardware'}")

        web.run_app(
            self.app,
            host='0.0.0.0',
            port=self.port,
            access_log=None
        )


def main():
    """Main entry point"""
    port = int(os.getenv('PORT', '8000'))

    # Handle signals gracefully
    def signal_handler(sig, frame):
        logger.info("Shutting down...")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    server = WebSocketServer(port=port)
    server.run()


if __name__ == '__main__':
    main()