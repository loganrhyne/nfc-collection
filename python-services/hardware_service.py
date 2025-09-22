#!/usr/bin/env python3
"""
Hardware Service - Manages NFC and LED hardware independently
Communicates with WebSocket server via Unix socket
"""

import asyncio
import json
import logging
import os
import signal
import socket
import sys
from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any
from pathlib import Path

# Hardware imports
try:
    import board
    import busio
    from digitalio import DigitalInOut
    from adafruit_pn532.spi import PN532_SPI
    from adafruit_pn532.i2c import PN532_I2C
    HARDWARE_AVAILABLE = True
except ImportError:
    HARDWARE_AVAILABLE = False
    print("Warning: Hardware libraries not available, running in mock mode")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class HardwareConfig:
    """Hardware configuration"""
    socket_path: str = "/tmp/nfc-hardware.sock"
    spi_cs_pin: str = "D25"
    mock_mode: bool = not HARDWARE_AVAILABLE
    scan_interval: float = 0.5
    debounce_time: float = 3.0


class NFCHardware:
    """NFC hardware manager"""

    def __init__(self, config: HardwareConfig):
        self.config = config
        self.pn532 = None
        self.last_tag_id = None
        self.last_scan_time = 0

        if not config.mock_mode:
            self._initialize_hardware()

    def _initialize_hardware(self):
        """Initialize NFC hardware"""
        try:
            # Try SPI first
            logger.info(f"Initializing NFC via SPI (CS pin {self.config.spi_cs_pin})...")
            spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
            cs_pin = DigitalInOut(getattr(board, self.config.spi_cs_pin))
            self.pn532 = PN532_SPI(spi, cs_pin, debug=False)

            # Test connection
            ic, ver, rev, support = self.pn532.firmware_version
            logger.info(f"Found PN532 via SPI - Firmware {ver}.{rev}")

            # Configure for passive tag reading
            self.pn532.SAM_configuration()

        except Exception as e:
            logger.error(f"SPI initialization failed: {e}")

            # Try I2C as fallback
            try:
                logger.info("Trying I2C connection...")
                i2c = busio.I2C(board.SCL, board.SDA)
                self.pn532 = PN532_I2C(i2c, debug=False)

                ic, ver, rev, support = self.pn532.firmware_version
                logger.info(f"Found PN532 via I2C - Firmware {ver}.{rev}")
                self.pn532.SAM_configuration()

            except Exception as e2:
                logger.error(f"I2C initialization also failed: {e2}")
                logger.warning("Running without hardware")
                self.config.mock_mode = True

    async def scan_for_tag(self) -> Optional[str]:
        """Scan for NFC tag"""
        if self.config.mock_mode:
            return None

        try:
            # Check for tag
            uid = self.pn532.read_passive_target(timeout=0.2)

            if uid:
                tag_id = uid.hex()
                current_time = asyncio.get_event_loop().time()

                # Debounce check
                if tag_id != self.last_tag_id or (current_time - self.last_scan_time) > self.config.debounce_time:
                    self.last_tag_id = tag_id
                    self.last_scan_time = current_time
                    return tag_id
        except Exception as e:
            logger.error(f"Scan error: {e}")

        return None

    def write_tag(self, data: Dict[str, Any]) -> bool:
        """Write data to NFC tag"""
        if self.config.mock_mode:
            logger.info(f"Mock: Would write {data}")
            return True

        try:
            # Implementation for writing to tag
            # This is simplified - real implementation would handle NDEF formatting
            logger.info(f"Writing to tag: {data}")
            return True
        except Exception as e:
            logger.error(f"Write error: {e}")
            return False

    def cleanup(self):
        """Cleanup hardware resources"""
        if self.pn532:
            logger.info("Cleaning up NFC hardware")
            # Release hardware resources
            pass


class LEDController:
    """LED controller manager"""

    def __init__(self):
        self.mode = "idle"
        logger.info("LED controller initialized")

    def set_mode(self, mode: str, **kwargs):
        """Set LED mode"""
        self.mode = mode
        logger.info(f"LED mode set to: {mode}")
        # Actual LED control would go here

    def cleanup(self):
        """Cleanup LED resources"""
        logger.info("Cleaning up LED controller")


class HardwareService:
    """Main hardware service that manages NFC and LEDs"""

    def __init__(self, config: HardwareConfig):
        self.config = config
        self.nfc = NFCHardware(config)
        self.led = LEDController()
        self.running = False
        self.clients = set()
        self.server = None

    async def start_unix_socket_server(self):
        """Start Unix socket server for IPC"""
        # Remove old socket if exists
        socket_path = Path(self.config.socket_path)
        if socket_path.exists():
            socket_path.unlink()

        self.server = await asyncio.start_unix_server(
            self.handle_client,
            path=self.config.socket_path
        )

        # Set socket permissions
        os.chmod(self.config.socket_path, 0o666)

        logger.info(f"Hardware service listening on {self.config.socket_path}")

        async with self.server:
            await self.server.serve_forever()

    async def handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        """Handle client connections"""
        client_addr = writer.get_extra_info('peername')
        logger.info(f"Client connected: {client_addr}")
        self.clients.add(writer)

        try:
            while True:
                # Read message
                data = await reader.readline()
                if not data:
                    break

                try:
                    message = json.loads(data.decode())
                    response = await self.process_command(message)

                    # Send response
                    writer.write(json.dumps(response).encode() + b'\n')
                    await writer.drain()

                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON received: {data}")
                except Exception as e:
                    logger.error(f"Error processing command: {e}")

        finally:
            self.clients.discard(writer)
            writer.close()
            await writer.wait_closed()
            logger.info(f"Client disconnected: {client_addr}")

    async def process_command(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Process commands from clients"""
        command = message.get('command')

        if command == 'ping':
            return {'status': 'ok', 'response': 'pong'}

        elif command == 'status':
            return {
                'status': 'ok',
                'nfc_available': not self.config.mock_mode,
                'led_mode': self.led.mode
            }

        elif command == 'write_tag':
            success = self.nfc.write_tag(message.get('data', {}))
            return {'status': 'ok' if success else 'error', 'success': success}

        elif command == 'set_led':
            self.led.set_mode(
                message.get('mode', 'idle'),
                **message.get('params', {})
            )
            return {'status': 'ok'}

        else:
            return {'status': 'error', 'error': f'Unknown command: {command}'}

    async def broadcast_event(self, event: Dict[str, Any]):
        """Broadcast event to all connected clients"""
        if not self.clients:
            return

        message = json.dumps(event).encode() + b'\n'
        disconnected = []

        for writer in self.clients:
            try:
                writer.write(message)
                await writer.drain()
            except Exception as e:
                logger.error(f"Failed to send to client: {e}")
                disconnected.append(writer)

        # Remove disconnected clients
        for writer in disconnected:
            self.clients.discard(writer)

    async def nfc_scan_loop(self):
        """Background task to scan for NFC tags"""
        logger.info("Starting NFC scan loop")

        while self.running:
            try:
                tag_id = await self.nfc.scan_for_tag()

                if tag_id:
                    logger.info(f"Tag detected: {tag_id}")

                    # Broadcast to all connected clients
                    await self.broadcast_event({
                        'event': 'tag_detected',
                        'tag_id': tag_id,
                        'timestamp': asyncio.get_event_loop().time()
                    })

                await asyncio.sleep(self.config.scan_interval)

            except Exception as e:
                logger.error(f"Scan loop error: {e}")
                await asyncio.sleep(1)

    async def run(self):
        """Run the hardware service"""
        self.running = True

        # Start NFC scanning in background
        scan_task = asyncio.create_task(self.nfc_scan_loop())

        # Start Unix socket server
        try:
            await self.start_unix_socket_server()
        finally:
            self.running = False
            scan_task.cancel()
            self.cleanup()

    def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up hardware service")
        self.nfc.cleanup()
        self.led.cleanup()

        # Remove socket file
        socket_path = Path(self.config.socket_path)
        if socket_path.exists():
            socket_path.unlink()


async def main():
    """Main entry point"""
    # Load configuration
    config = HardwareConfig()

    # Override from environment
    if os.getenv('HARDWARE_MOCK_MODE', '').lower() == 'true':
        config.mock_mode = True
    if os.getenv('HARDWARE_SOCKET_PATH'):
        config.socket_path = os.getenv('HARDWARE_SOCKET_PATH')

    logger.info(f"Starting hardware service (mock_mode={config.mock_mode})")

    # Create and run service
    service = HardwareService(config)

    # Handle shutdown signals
    def signal_handler(sig, frame):
        logger.info(f"Received signal {sig}, shutting down...")
        service.running = False

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        await service.run()
    except Exception as e:
        logger.error(f"Service error: {e}")
        return 1

    return 0


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))