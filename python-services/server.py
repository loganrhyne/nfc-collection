#!/usr/bin/env python3
"""
Clean, single WebSocket server with integrated NFC hardware support
"""

import asyncio
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Set

try:
    import socketio
    from aiohttp import web
    from aiohttp_cors import setup as cors_setup, ResourceOptions
except ImportError as e:
    print(f"Failed to import required packages: {e}", file=sys.stderr)
    print("Please ensure all packages are installed: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(1)

# NFC service (executor-offloaded I/O, hardware lock, presence-based scan state,
# write verification, reinit-after-N-errors). Replaces the old inline NFCHandler.
from services.nfc_service import NFCService, NFCHardwareError, NFCTimeoutError
from services.tag_registry import get_tag_registry

# LED imports
try:
    from services.led_controller import get_led_controller, LEDMode
    from services.led_mode_manager import LEDModeManager
    LED_AVAILABLE = True
except ImportError as e:
    LED_AVAILABLE = False
    print(f"LED modules not available: {e}")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class WebSocketServer:
    """Main server handling WebSocket connections and NFC scanning"""

    def __init__(self, port: int = 8000):
        self.port = port
        self.nfc = NFCService()
        self.registry = get_tag_registry()
        self.clients: Set[str] = set()
        self.scanning = True
        self.scan_task = None

        # Initialize LED controller if available
        self.led_controller = None
        self.led_manager = None
        if LED_AVAILABLE:
            try:
                self.led_controller = get_led_controller()
                self.led_manager = LEDModeManager(self.led_controller)
                # Set up status callback for visualization updates
                self.led_manager.set_status_callback(self.send_visualization_status)
                logger.info("LED controller initialized")
            except Exception as e:
                logger.warning(f"Could not initialize LED controller: {e}")

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
                # 'degraded' means the reader failed and we fell back to mock --
                # NOT the same as running in mock mode deliberately.
                'nfc_degraded': self.nfc.degraded,
                'led_available': self.led_manager is not None,
                'scanning': self.scanning,
                'scanning_healthy': self.nfc.scanning_healthy,
                'reader': self.nfc.get_status(),
                'registry': self.registry.status(),
                'clients': len(self.clients),
                'timestamp': datetime.now(timezone.utc).isoformat()
            })

        async def debug_scan(request):
            """Inject a synthetic tag scan. Mock mode only.

            Makes the tag_scanned path exercisable without a PN532, which was
            previously impossible -- the mock reader emitted nothing at all.

                curl -X POST localhost:8000/debug/scan -d '{"entry_id": "ABC123"}'

            Omit entry_id to simulate an unregistered tag.
            """
            if not self.nfc.mock_mode:
                return web.json_response(
                    {'error': 'debug/scan is only available in mock mode'}, status=403)
            try:
                body = await request.json()
            except Exception:
                body = {}
            ok = self.nfc.inject_mock_scan(
                entry_id=body.get('entry_id'),
                uid=body.get('uid', 'MOCK:01:23:45:67'),
                geo=body.get('geo'),
            )
            return web.json_response({'injected': ok, 'entry_id': body.get('entry_id')})

        self.app.router.add_get('/health', health)
        self.app.router.add_post('/debug/scan', debug_scan)

    def setup_socketio_handlers(self):
        """Socket.IO event handlers"""

        @self.sio.event
        async def connect(sid, environ):
            self.clients.add(sid)
            logger.info(f"Client connected: {sid}")

            await self.sio.emit('connected', {
                'message': 'Connected to NFC server',
                'hardware_available': not self.nfc.mock_mode,
                # Distinguishes "running in mock mode on purpose" from "the reader
                # failed and we fell back", which previously looked identical.
                'nfc_degraded': self.nfc.degraded,
                'led_available': self.led_manager is not None,
                'registry': self.registry.status()
            }, to=sid)

            # Send initial scanner status
            await self.sio.emit('scanner_status', {
                'connected': not self.nfc.mock_mode,
                'scanning': self.scanning,
                'degraded': self.nfc.degraded
            }, to=sid)

        @self.sio.event
        async def disconnect(sid):
            self.clients.discard(sid)
            logger.info(f"Client disconnected: {sid}")

        @self.sio.event
        async def ping(sid, data=None):
            # The client sends {timestamp: Date.now()} -- epoch milliseconds.
            # Echo it back unchanged so the round-trip maths actually works; the
            # old handler took no data param (TypeError on every beat) and replied
            # with an ISO string, which the client subtracted from Date.now().
            client_ts = (data or {}).get('timestamp') if isinstance(data, dict) else None
            await self.sio.emit('pong', {
                'timestamp': client_ts,
                'server_time': datetime.now(timezone.utc).isoformat()
            }, to=sid)

        @self.sio.event
        async def register_tag_start(sid, data):
            """Handle tag registration request"""
            entry_id = data.get('entry_id')
            entry_data = data.get('entry_data', {})
            logger.info(f"Registration requested for entry {entry_id}")

            if not entry_id:
                await self.sio.emit('registration_error', {
                    'message': 'No entry selected for registration.'
                }, to=sid)
                return

            await self.sio.emit('awaiting_tag', {}, to=sid)

            # Build the compact tag payload {v, id, geo, ts}.
            # Coordinates come from the journal, not from the client: this gets
            # written permanently onto a sticker, so it should come from the
            # same source of truth the display reads. (The client historically
            # sent entry_data.coordinates, which nothing on this side read.)
            geo = self.registry.coords_of(entry_id)
            if geo is None:
                client_geo = (entry_data.get('geo')
                              or entry_data.get('coordinates'))
                loc = entry_data.get('location') or {}
                if not client_geo and loc.get('latitude') is not None:
                    client_geo = [loc.get('latitude'), loc.get('longitude')]
                geo = client_geo

            if not geo or geo[0] is None or geo[1] is None:
                # Refuse rather than bake [0, 0] into hardware. Writing a wrong
                # coordinate means finding that physical box again to rewrite it.
                logger.error(f"Refusing to register {entry_id}: no coordinates")
                await self.sio.emit('registration_error', {
                    'message': ('This entry has no location. Add one in Day One, '
                                're-export and sync, then register it.')
                }, to=sid)
                return

            payload = {
                'v': 1,
                'id': entry_id,
                'geo': geo,
                'ts': int(time.time()),
            }

            if self.nfc.busy:
                logger.info("Reader busy - rejecting concurrent registration")
                await self.sio.emit('registration_error', {
                    'message': 'A registration is already in progress. '
                               'Wait for it to finish or time out.'
                }, to=sid)
                return

            try:
                # One queued command: the reader thread waits for a tag and
                # writes it without anything else touching the device in
                # between, so the tag that was detected is the tag written.
                result = await self.nfc.register_tag(payload, timeout=20)
            except NFCTimeoutError:
                logger.info(f"Registration for {entry_id}: no tag presented in time")
                await self.sio.emit('registration_error', {
                    'message': 'No tag detected. Hold the sample on the reader and try again.'
                }, to=sid)
                return
            except NFCHardwareError as e:
                logger.error(f"Registration hardware error: {e}")
                await self.sio.emit('registration_error', {
                    'message': 'The NFC reader is not responding.'
                }, to=sid)
                return

            if result.success:
                # Record it before lighting anything: the registry is the record
                # of truth and must not depend on the LEDs being present.
                record = self.registry.register(entry_id, result.tag_uid)
                grid_index = record.get('grid_index')
                logger.info(f"Registered entry {entry_id} to tag {result.tag_uid} "
                            f"-> cell {grid_index}")

                placement = None
                if grid_index is not None:
                    cols = 20
                    if self.led_manager and self.led_manager.led_controller:
                        cols = self.led_manager.led_controller.config.grid_cols
                    placement = {
                        'grid_index': grid_index,
                        'row': grid_index // cols,
                        'col': grid_index % cols,
                    }
                    # Show where the box goes. This deliberately lights a cell
                    # while the grid's global mode is off -- the user asked
                    # where this sample belongs, so it is intentional.
                    if self.led_manager and self.led_manager.led_controller:
                        try:
                            lit = await self.led_manager.led_controller.show_placement_beacon(grid_index)
                            placement['beacon'] = lit
                        except Exception as e:
                            logger.error(f"Placement beacon failed: {e}")
                            placement['beacon'] = False
                else:
                    logger.warning(f"Entry {entry_id} is not in the journal - "
                                   f"no grid cell could be assigned")

                await self.sio.emit('tag_registered', {
                    'entry_id': entry_id,
                    'tag_uid': result.tag_uid,
                    'success': True,
                    'placement': placement,
                    'registry': self.registry.status(),
                }, to=sid)
            else:
                await self.sio.emit('registration_error', {
                    'message': result.error or 'Failed to write to tag. Please try again.'
                }, to=sid)

        @self.sio.event
        async def register_tag_cancel(sid, data=None):
            logger.info("Registration cancelled")
            await self.sio.emit('registration_cancelled', {}, to=sid)

        @self.sio.event
        async def led_update(sid, data):
            """Handle LED update requests"""
            if not self.led_manager:
                logger.debug("LED update received but LED manager not available")
                return

            try:
                logger.info(f"LED update from {sid}: {data}")

                # Extract LED command type
                command = data.get('command', 'set_selected')
                status = None

                if command == 'update_interactive':
                    # Update LEDs for interactive mode
                    entries = data.get('entries', [])
                    await self.led_manager.handle_interactive_update(entries)
                    logger.info(f"LED: Updated interactive mode with {len(entries)} entries")

                elif command == 'clear_all':
                    # Clear all LEDs
                    await self.led_manager.clear_all()
                    logger.info("LED: Cleared all LEDs")

                elif command == 'set_mode':
                    # Switch LED mode
                    mode_str = data.get('mode', 'interactive')

                    # Properly handle all three modes
                    if mode_str == 'off':
                        mode = LEDMode.OFF
                    elif mode_str == 'visualization':
                        mode = LEDMode.VISUALIZATION
                    else:
                        mode = LEDMode.INTERACTIVE

                    # Update entries if provided (for visualization mode)
                    if 'allEntries' in data:
                        await self.led_manager.update_entries(data['allEntries'])

                    # Set the mode
                    status = await self.led_manager.set_mode(mode)
                    logger.info(f"LED: Mode set to {mode.value}")

                    # If switching to interactive mode and LED data is included, update immediately
                    if mode == LEDMode.INTERACTIVE and 'interactiveLedData' in data:
                        led_data = data['interactiveLedData']
                        await self.led_manager.handle_interactive_update(led_data)

                    # If switching to visualization mode, also send visualization status separately
                    elif mode == LEDMode.VISUALIZATION and status and status.get('visualization'):
                        await self.sio.emit('visualization_status', status['visualization'], to=sid)

                # Get current status if not already set
                if status is None:
                    status = self.led_manager.get_status()

                # Send acknowledgment with current status
                await self.sio.emit('led_status', {
                    'success': True,
                    'status': status
                }, to=sid)

            except Exception as e:
                logger.error(f"LED update error: {e}", exc_info=True)
                await self.sio.emit('led_status', {
                    'success': False,
                    'error': str(e)
                }, to=sid)

        @self.sio.event
        async def led_brightness(sid, data):
            """Handle LED brightness adjustment"""
            if not self.led_controller:
                return

            try:
                brightness = data.get('brightness', 0.5)
                await self.led_controller.set_brightness(brightness)
                logger.info(f"LED brightness set to {brightness:.0%}")

                # Send confirmation
                await self.sio.emit('led_brightness_updated', {
                    'brightness': brightness
                }, to=sid)
            except Exception as e:
                logger.error(f"LED brightness error: {e}")

        @self.sio.event
        async def visualization_control(sid, data):
            """Handle visualization control commands"""
            if not self.led_manager:
                return

            try:
                command = data.get('command')
                logger.info(f"Visualization control from {sid}: {command}")

                if command == 'select':
                    # Select specific visualization
                    viz_type = data.get('visualization_type')
                    if viz_type:
                        await self.led_manager.select_visualization(viz_type)
                        logger.info(f"Selected visualization: {viz_type}")

                elif command == 'pause':
                    # Pause/resume visualization
                    await self.led_manager.pause_visualization()
                    logger.info("Toggled visualization pause state")

                elif command == 'next':
                    # Next visualization
                    await self.led_manager.next_visualization()
                    logger.info("Switched to next visualization")

                elif command == 'previous':
                    # Previous visualization
                    await self.led_manager.previous_visualization()
                    logger.info("Switched to previous visualization")

                # Send updated status
                status = self.led_manager.get_status()
                if status.get('visualization'):
                    await self.sio.emit('visualization_status', status['visualization'], to=sid)

            except Exception as e:
                logger.error(f"Visualization control error: {e}")

    async def on_tag_scanned(self, event: Dict[str, Any]):
        """Handle one scan event, delivered on the event loop by NFCService.

        NFCService emits once on tag arrival (presence-based, with a grace period)
        rather than re-firing every few seconds while a box sits on the cradle, and
        suppresses events entirely while a registration write is in progress.
        """
        uid = event.get('uid')
        data = event.get('data') or {}
        entry_id = data.get('id')

        if entry_id:
            logger.info(f"Tag {uid} -> entry {entry_id}")
        else:
            logger.warning(f"Tag {uid} carries no entry ID - needs registration")

        await self.sio.emit('tag_scanned', {
            'entry_id': entry_id,
            'tag_data': {'tag_id': uid},
            'timestamp': datetime.now(timezone.utc).isoformat()
        })

    async def startup(self, app):
        """Startup tasks"""
        logger.info("Starting NFC scanning")
        # Reader I/O runs on a dedicated thread; events arrive here via a queue,
        # so a wedged or slow PN532 can no longer stall the event loop.
        self.nfc.start(self.on_tag_scanned)
        self.scan_task = asyncio.create_task(self.nfc.process_scan_queue())

    async def send_visualization_status(self, status: Dict):
        """Send visualization status to all connected clients"""
        await self.sio.emit('visualization_status', status)

    async def cleanup(self, app):
        """Cleanup tasks"""
        logger.info("Stopping NFC scanning")
        self.scanning = False
        # Stop the reader thread first so it stops enqueuing, then the consumer.
        try:
            self.nfc.stop()
        except Exception as e:
            logger.error(f"Error stopping NFC scanning: {e}")
        if getattr(self, 'scan_task', None):
            self.scan_task.cancel()

        # Turn off LEDs on shutdown
        if self.led_manager:
            try:
                await self.led_manager.set_mode(LEDMode.OFF)
                logger.info("LEDs turned off")
            except Exception as e:
                logger.error(f"Error turning off LEDs: {e}")

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
    print(f"Starting NFC Collection Server...", file=sys.stderr)
    print(f"Python: {sys.executable}", file=sys.stderr)
    print(f"Working dir: {os.getcwd()}", file=sys.stderr)

    port = int(os.getenv('PORT', '8000'))
    print(f"Port: {port}", file=sys.stderr)

    # aiohttp's web.run_app installs its own SIGINT/SIGTERM handlers that
    # trigger graceful shutdown via on_cleanup. Don't register our own —
    # sys.exit() inside the handler bypasses cleanup and leaves NFC/LED
    # state stranded, then systemd SIGKILLs us after TimeoutStopSec.

    try:
        server = WebSocketServer(port=port)
        server.run()
    except Exception as e:
        print(f"Failed to start server: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()