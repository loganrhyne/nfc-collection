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

    async def scan_for_tag(self) -> Optional[Dict[str, str]]:
        """Scan for NFC tag and read its data"""
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

                    # Try to read NDEF data from the tag
                    entry_id = self._read_ndef_entry_id()

                    return {
                        'tag_id': tag_id,
                        'entry_id': entry_id
                    }
        except Exception as e:
            logger.error(f"NFC scan error: {e}")

        return None

    def _read_ndef_entry_id(self) -> Optional[str]:
        """Read entry ID from NDEF JSON data on tag"""
        try:
            # Read data from tag (NTAG uses ntag2xx_read_block)
            data = bytearray()
            for page in range(4, 40):  # Read up to page 40
                try:
                    block = self.pn532.ntag2xx_read_block(page)
                    if block:
                        data.extend(block)
                    else:
                        break
                except:
                    break

            # Parse NDEF TLV structure
            if len(data) > 2 and data[0] == 0x03:  # NDEF message TLV
                # Get NDEF message length
                if data[1] == 0xFF:  # Long format
                    if len(data) > 4:
                        ndef_len = (data[2] << 8) | data[3]
                        ndef_start = 4
                else:  # Short format
                    ndef_len = data[1]
                    ndef_start = 2

                if len(data) >= ndef_start + ndef_len:
                    ndef_message = data[ndef_start:ndef_start + ndef_len]

                    # Check for Text record (TNF=0x01, Type='T')
                    if len(ndef_message) > 5 and ndef_message[3] == 0x54:  # 'T'
                        payload_len = ndef_message[2]
                        status_byte = ndef_message[4]
                        lang_len = status_byte & 0x3F

                        # Extract text data
                        text_start = 5 + lang_len
                        text_end = 4 + payload_len

                        if len(ndef_message) >= text_end:
                            text_data = ndef_message[text_start:text_end]
                            text_str = text_data.decode('utf-8', errors='ignore')

                            # Parse JSON to get entry ID
                            if text_str.startswith('{'):
                                try:
                                    json_data = json.loads(text_str)
                                    entry_id = json_data.get('id')
                                    if entry_id:
                                        logger.info(f"Found entry ID in tag JSON: {entry_id}")
                                        return entry_id
                                except json.JSONDecodeError:
                                    logger.debug("Failed to parse JSON from tag")

        except Exception as e:
            logger.debug(f"Could not read NDEF data: {e}")

        return None

    def _create_text_ndef(self, text: str) -> bytes:
        """Create NDEF text record"""
        text_bytes = text.encode('utf-8')

        # NDEF record header
        ndef_flags = 0xD1  # MB=1, ME=1, SR=1, TNF=0x01 (Well-known)
        type_length = 0x01
        payload_length = len(text_bytes) + 3  # +3 for status byte and "en"
        type_field = ord('T')  # Text record type

        # Text record payload
        status_byte = 0x02  # UTF-8, "en" is 2 chars
        language = b'en'

        # Build NDEF message
        ndef_message = bytes([
            ndef_flags,
            type_length,
            payload_length,
            type_field,
            status_byte
        ]) + language + text_bytes

        # Add TLV wrapper for NTAG
        if len(ndef_message) < 255:
            ndef_data = bytes([0x03, len(ndef_message)]) + ndef_message + bytes([0xFE])
        else:
            ndef_data = bytes([0x03, 0xFF,
                             (len(ndef_message) >> 8) & 0xFF,
                             len(ndef_message) & 0xFF]) + ndef_message + bytes([0xFE])

        return ndef_data

    async def write_entry_to_tag(self, entry_id: str, entry_data: Dict[str, Any] = None) -> bool:
        """Write entry data to NFC tag in the same format as existing tags"""
        if self.mock_mode:
            await asyncio.sleep(1)
            return True

        try:
            # Wait for tag
            uid = self.pn532.read_passive_target(timeout=5)
            if not uid:
                logger.error("No tag detected for writing")
                return False

            # Create JSON data matching the existing format
            tag_data = {
                'v': 1,  # Version
                'id': entry_id,  # The entry UUID
                'geo': entry_data.get('coordinates', [0, 0]) if entry_data else [0, 0],
                'ts': int(datetime.now().timestamp()) if not entry_data else
                      int(datetime.fromisoformat(entry_data.get('timestamp', datetime.now().isoformat())).timestamp())
            }

            # Convert to JSON and create NDEF message
            json_str = json.dumps(tag_data, separators=(',', ':'))
            ndef_data = self._create_text_ndef(json_str)

            logger.info(f"Writing {len(ndef_data)} bytes of NDEF data to tag")

            # Clear existing data first
            for page in range(4, 8):
                self.pn532.ntag2xx_write_block(page, [0x00, 0x00, 0x00, 0x00])

            # Write new NDEF data
            start_page = 4
            pages_needed = (len(ndef_data) + 3) // 4

            for page_num in range(pages_needed):
                actual_page = start_page + page_num

                if actual_page > 39:  # NTAG213 limit
                    break

                start_idx = page_num * 4
                end_idx = min(start_idx + 4, len(ndef_data))
                page_data = list(ndef_data[start_idx:end_idx])

                # Pad to 4 bytes
                while len(page_data) < 4:
                    page_data.append(0x00)

                success = self.pn532.ntag2xx_write_block(actual_page, page_data)
                if not success:
                    logger.error(f"Failed to write page {actual_page}")
                    return False

            logger.info(f"Successfully wrote entry {entry_id} to tag")
            return True

        except Exception as e:
            logger.error(f"Failed to write to tag: {e}")
            return False


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
        async def register_tag_start(sid, data):
            """Handle tag registration request"""
            entry_id = data.get('entry_id')
            entry_data = data.get('entry_data', {})
            logger.info(f"Registration requested for entry {entry_id}")

            await self.sio.emit('awaiting_tag', {}, to=sid)

            # Write entry data to the tag
            success = await self.nfc.write_entry_to_tag(entry_id, entry_data)

            if success:
                await self.sio.emit('tag_registered', {
                    'entry_id': entry_id,
                    'success': True
                }, to=sid)
            else:
                await self.sio.emit('error', {
                    'message': 'Failed to write to tag. Please try again.'
                }, to=sid)

        @self.sio.event
        async def register_tag_cancel(sid, data=None):
            logger.info("Registration cancelled")
            await self.sio.emit('registration_cancelled', {}, to=sid)

    async def nfc_scan_loop(self):
        """Background task to scan for NFC tags"""
        logger.info("Starting NFC scan loop")

        while self.scanning:
            try:
                tag_data = await self.nfc.scan_for_tag()

                if tag_data:
                    tag_id = tag_data['tag_id']
                    entry_id = tag_data.get('entry_id')

                    logger.info(f"Tag detected: {tag_id}")

                    if entry_id:
                        logger.info(f"Tag contains entry ID: {entry_id}")
                    else:
                        logger.warning(f"No entry ID found on tag {tag_id} - tag may need to be registered")

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