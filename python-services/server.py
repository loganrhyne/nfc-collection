#!/usr/bin/env python3
"""
Refactored WebSocket server with enterprise-grade features
"""

import asyncio
import json
import logging
import os
import time
from datetime import datetime
from typing import Dict, Optional, Any
from collections import defaultdict
from dataclasses import dataclass, asdict

import socketio
from aiohttp import web
from aiohttp_cors import setup as cors_setup, ResourceOptions

from config import config, ServerConfig
from services.nfc_service import NFCService, NFCError, TagInfo
from services.led_controller import get_led_controller, LEDMode
from services.led_visualizations import VisualizationType
from services.led_mode_manager import LEDModeManager

# Configure structured logging
logging.basicConfig(
    level=config.log.level,
    format=config.log.format
)
logger = logging.getLogger(__name__)


@dataclass
class ClientSession:
    """Track client session information"""
    sid: str
    connected_at: float
    last_activity: float
    authenticated: bool = False
    request_count: int = 0
    registration_active: bool = False
    entry_id: Optional[str] = None


class RateLimiter:
    """Simple rate limiter implementation"""
    
    def __init__(self, requests: int, window: int):
        self.requests = requests
        self.window = window
        self.clients = defaultdict(list)
    
    def is_allowed(self, client_id: str) -> bool:
        """Check if client is within rate limit"""
        now = time.time()
        # Clean old entries
        self.clients[client_id] = [
            timestamp for timestamp in self.clients[client_id]
            if now - timestamp < self.window
        ]
        
        if len(self.clients[client_id]) < self.requests:
            self.clients[client_id].append(now)
            return True
        return False


class NFCWebSocketServer:
    """Enterprise-grade WebSocket server for NFC operations"""
    
    def __init__(self, server_config: ServerConfig = None):
        self.config = server_config or config.server
        self.nfc_service = NFCService()
        self.led_controller = get_led_controller()
        self.led_mode_manager = LEDModeManager(self.led_controller)
        # Set up status callback for visualization updates
        self.led_mode_manager.set_status_callback(self.send_visualization_status)
        self.sessions: Dict[str, ClientSession] = {}
        self.rate_limiter = RateLimiter(
            self.config.rate_limit_requests,
            self.config.rate_limit_window
        ) if self.config.rate_limit_enabled else None
        
        # Version info
        self.version_info = {
            'server_version': os.getenv('SERVER_VERSION', 'dev'),
            'build_time': os.getenv('SERVER_BUILD_TIME', datetime.utcnow().isoformat()),
            'start_time': datetime.utcnow().isoformat(),
            'nfc_hardware_available': False,
            'nfc_mock_mode': False
        }
        
        # Initialize Socket.IO with configuration
        self.sio = socketio.AsyncServer(
            cors_allowed_origins=self._parse_cors_origins(),
            logger=logger.getChild('socketio'),
            engineio_logger=logger.getChild('engineio'),
            max_http_buffer_size=self.config.max_message_size,
            ping_timeout=60,
            ping_interval=self.config.heartbeat_interval,
            async_mode='aiohttp'  # Ensure we're using aiohttp for async
        )
        
        # Create aiohttp app
        self.app = web.Application()
        self.sio.attach(self.app)
        
        # Setup CORS properly
        if self.config.cors_origins != 'none':
            cors = cors_setup(self.app, defaults={
                "*": ResourceOptions(
                    allow_credentials=True,
                    expose_headers="*",
                    allow_headers="*",
                    allow_methods="*"
                )
            })
        
        # Register event handlers
        self._register_handlers()
        
        # Setup routes
        self._setup_routes()
    
    def _parse_cors_origins(self) -> str:
        """Parse CORS origins configuration"""
        if self.config.cors_origins == '*':
            logger.warning("CORS is set to allow all origins - not recommended for production")
            return '*'
        elif self.config.cors_origins == 'none':
            return []
        else:
            # Parse comma-separated list of origins
            return [origin.strip() for origin in self.config.cors_origins.split(',')]
    
    def _setup_routes(self):
        """Setup HTTP routes"""
        # Health check endpoint
        async def health_check(request):
            status = self.nfc_service.get_status()
            return web.json_response({
                'status': 'healthy',
                'nfc': status,
                'sessions': len(self.sessions),
                'timestamp': datetime.utcnow().isoformat()
            })
        
        # Metrics endpoint
        async def metrics(request):
            return web.json_response({
                'active_sessions': len(self.sessions),
                'total_requests': sum(s.request_count for s in self.sessions.values()),
                'nfc_status': self.nfc_service.get_status()
            })
        
        self.app.router.add_get('/health', health_check)
        self.app.router.add_get('/metrics', metrics)
    
    def _register_handlers(self):
        """Register Socket.IO event handlers"""
        self.sio.on('connect', self.handle_connect)
        self.sio.on('disconnect', self.handle_disconnect)
        self.sio.on('ping', self.handle_ping)
        self.sio.on('register_tag_start', self.handle_register_tag_start)
        self.sio.on('register_tag_cancel', self.handle_register_tag_cancel)
        self.sio.on('led_update', self.handle_led_update)
        self.sio.on('led_brightness', self.handle_led_brightness)
        self.sio.on('visualization_control', self.handle_visualization_control)
    
    async def _check_auth(self, sid: str, auth: Dict[str, Any]) -> bool:
        """Check authentication if enabled"""
        if not self.config.auth_enabled:
            return True
        
        token = auth.get('token') if auth else None
        if token == self.config.auth_token:
            logger.info(f"Client {sid} authenticated successfully")
            return True
        
        logger.warning(f"Client {sid} failed authentication")
        return False
    
    async def _check_rate_limit(self, sid: str) -> bool:
        """Check rate limit for client"""
        if not self.rate_limiter:
            return True
        
        if self.rate_limiter.is_allowed(sid):
            return True
        
        logger.warning(f"Client {sid} exceeded rate limit")
        await self.sio.emit('error', {
            'code': 'RATE_LIMIT_EXCEEDED',
            'message': 'Too many requests. Please slow down.'
        }, room=sid)
        return False
    
    async def handle_connect(self, sid: str, environ: Dict, auth: Dict = None):
        """Handle client connection with authentication"""
        logger.info(f"Client connection attempt: {sid}")
        
        # Check authentication
        if not await self._check_auth(sid, auth):
            await self.sio.emit('error', {
                'code': 'AUTH_FAILED',
                'message': 'Authentication required'
            }, room=sid)
            return False
        
        # Create session
        self.sessions[sid] = ClientSession(
            sid=sid,
            connected_at=time.time(),
            last_activity=time.time(),
            authenticated=self.config.auth_enabled
        )
        
        # Update NFC service status
        nfc_status = self.nfc_service.get_status()
        self.version_info['nfc_hardware_available'] = nfc_status['hardware_available']
        self.version_info['nfc_mock_mode'] = nfc_status['mock_mode']
        
        # Send connection status with version info
        await self.sio.emit('connection_status', {
            'connected': True,
            'nfc_available': self.nfc_service.get_status()['hardware_available'],
            'server_version': self.version_info['server_version'],
            'build_info': self.version_info,
            'features': {
                'rate_limiting': self.config.rate_limit_enabled,
                'authentication': self.config.auth_enabled,
                'heartbeat': True,
                'message_queue': True
            }
        }, room=sid)
        
        logger.info(f"Client {sid} connected successfully")
        return True
    
    async def handle_disconnect(self, sid: str):
        """Handle client disconnection"""
        if sid in self.sessions:
            session = self.sessions[sid]
            duration = time.time() - session.connected_at
            logger.info(f"Client {sid} disconnected after {duration:.1f}s")
            
            # Cancel any active registration
            if session.registration_active:
                # Cleanup logic here
                pass
            
            del self.sessions[sid]
    
    async def handle_ping(self, sid: str, data: Dict):
        """Handle ping for latency measurement"""
        if sid in self.sessions:
            self.sessions[sid].last_activity = time.time()
        
        await self.sio.emit('pong', {
            'timestamp': data.get('timestamp', time.time() * 1000),
            'server_time': time.time() * 1000
        }, room=sid)
    
    async def handle_register_tag_start(self, sid: str, data: Dict):
        """Handle tag registration with improved validation"""
        try:
            # Rate limit check
            if not await self._check_rate_limit(sid):
                return
            
            # Update session
            session = self.sessions.get(sid)
            if not session:
                logger.error(f"No session found for {sid}")
                return
            
            session.last_activity = time.time()
            session.request_count += 1
            
            # Validate request
            entry_id = data.get('entry_id')
            entry_data = data.get('entry_data', {})
            
            if not entry_id:
                await self.sio.emit('error', {
                    'code': 'INVALID_REQUEST',
                    'message': 'entry_id is required',
                    'field': 'entry_id'
                }, room=sid)
                return
            
            # Validate entry_data structure
            if not isinstance(entry_data, dict):
                await self.sio.emit('error', {
                    'code': 'INVALID_REQUEST',
                    'message': 'entry_data must be an object',
                    'field': 'entry_data'
                }, room=sid)
                return
            
            # Check for active registration
            if session.registration_active:
                await self.sio.emit('error', {
                    'code': 'REGISTRATION_IN_PROGRESS',
                    'message': 'Another registration is already in progress'
                }, room=sid)
                return
            
            # Mark registration as active
            session.registration_active = True
            session.entry_id = entry_id
            
            # Send acknowledgment
            await self.sio.emit('awaiting_tag', {
                'message': 'Place NFC tag on reader',
                'timeout': self.nfc_service.config.scan_timeout,
                'entry_id': entry_id
            }, room=sid)
            
            # Start tag detection
            asyncio.create_task(self._handle_tag_registration(sid, entry_id, entry_data))
            
        except Exception as e:
            logger.error(f"Error in register_tag_start: {e}", exc_info=True)
            await self.sio.emit('error', {
                'code': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred'
            }, room=sid)
    
    async def _handle_tag_registration(self, sid: str, entry_id: str, entry_data: Dict):
        """Handle the tag registration process with proper cleanup"""
        session = self.sessions.get(sid)
        if not session:
            return
        
        try:
            # Wait for tag
            logger.info(f"Waiting for tag for session {sid}")
            tag_info = await self.nfc_service.wait_for_tag()
            
            if not tag_info:
                await self.sio.emit('error', {
                    'code': 'TIMEOUT',
                    'message': 'No tag detected within timeout period'
                }, room=sid)
                return
            
            logger.info(f"Tag detected: {tag_info.uid}")
            
            # Prepare data for tag
            timestamp_str = entry_data.get('timestamp', datetime.utcnow().isoformat())
            if timestamp_str.endswith('Z'):
                timestamp_str = timestamp_str[:-1] + '+00:00'
            
            ndef_payload = {
                'v': 1,
                'id': entry_id,
                'geo': entry_data.get('coordinates', [0, 0]),
                'ts': int(datetime.fromisoformat(timestamp_str).timestamp())
            }
            
            # Validate data will fit
            try:
                self.nfc_service.validate_json_data(ndef_payload)
            except NFCError as e:
                await self.sio.emit('error', {
                    'code': 'DATA_VALIDATION_ERROR',
                    'message': str(e)
                }, room=sid)
                return
            
            # Send progress updates
            # Convert tag_info to dict with enum values properly serialized
            tag_info_dict = asdict(tag_info)
            tag_info_dict['type'] = tag_info.type.value
            
            await self.sio.emit('tag_write_progress', {
                'progress': 25,
                'message': f'Tag detected ({tag_info.type.value}), preparing data...',
                'tag_info': tag_info_dict
            }, room=sid)
            
            # Write to tag
            logger.info(f"Writing to tag {tag_info.uid}")
            result = await self.nfc_service.write_json_to_tag(tag_info, ndef_payload)
            
            if result.success:
                await self.sio.emit('tag_registered', {
                    'success': True,
                    'tag_uid': tag_info.uid,
                    'entry_id': entry_id,
                    'ndef_data': ndef_payload,
                    'bytes_written': result.bytes_written,
                    'tag_type': tag_info.type.value
                }, room=sid)
                logger.info(f"Successfully registered tag {tag_info.uid} for entry {entry_id}")
            else:
                await self.sio.emit('error', {
                    'code': 'WRITE_FAILED',
                    'message': result.error or 'Failed to write data to tag',
                    'retry_count': result.retry_count
                }, room=sid)
                logger.error(f"Failed to write tag: {result.error}")
                
        except NFCError as e:
            logger.error(f"NFC error during registration: {e}")
            await self.sio.emit('error', {
                'code': 'NFC_ERROR',
                'message': str(e)
            }, room=sid)
        except Exception as e:
            logger.error(f"Unexpected error during registration: {e}", exc_info=True)
            await self.sio.emit('error', {
                'code': 'REGISTRATION_ERROR',
                'message': 'An unexpected error occurred during registration'
            }, room=sid)
        finally:
            # Clean up session state
            if session:
                session.registration_active = False
                session.entry_id = None
    
    async def handle_register_tag_cancel(self, sid: str, data: Dict):
        """Cancel ongoing registration"""
        session = self.sessions.get(sid)
        if session and session.registration_active:
            logger.info(f"Cancelling registration for client {sid}")
            session.registration_active = False
            session.entry_id = None
            # Additional cleanup if needed
    
    async def handle_tag_scanned(self, tag_data: Dict[str, Any]):
        """Handle scanned tag data with validation"""
        try:
            logger.info(f"Tag scanned with data: {tag_data}")
            
            # Validate tag data
            if not isinstance(tag_data, dict) or 'id' not in tag_data:
                logger.warning("Invalid tag data received")
                return
            
            # Emit to all connected clients
            await self.sio.emit('tag_scanned', {
                'entry_id': tag_data.get('id'),
                'tag_data': tag_data,
                'timestamp': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error handling scanned tag: {e}")
    
    async def handle_led_update(self, sid: str, data: Dict):
        """Handle LED update commands"""
        session = self.sessions.get(sid)
        if not session:
            return
        
        try:
            logger.info(f"LED update from {sid}: {data}")
            
            # Extract LED command type
            command = data.get('command', 'set_selected')
            status = None
            
            if command == 'update_interactive':
                # Update LEDs for interactive mode
                entries = data.get('entries', [])
                await self.led_mode_manager.handle_interactive_update(entries)
                logger.info(f"LED: Updated interactive mode with {len(entries)} entries")
                
            elif command == 'clear_all':
                # Clear all LEDs
                await self.led_mode_manager.clear_all()
                logger.info("LED: Cleared all LEDs")
                
            elif command == 'set_mode':
                # Switch LED mode
                mode_str = data.get('mode', 'interactive')
                mode = LEDMode.INTERACTIVE if mode_str == 'interactive' else LEDMode.VISUALIZATION
                
                
                # Update entries if provided (for visualization mode)
                if 'allEntries' in data:
                    await self.led_mode_manager.update_entries(data['allEntries'])
                
                # Set the mode
                status = await self.led_mode_manager.set_mode(mode)
                logger.info(f"LED: Mode set to {mode.value}")
                
                # If switching to interactive mode and LED data is included, update immediately
                if mode == LEDMode.INTERACTIVE and 'interactiveLedData' in data:
                    led_data = data['interactiveLedData']
                    await self.led_mode_manager.handle_interactive_update(led_data)
                
            # Get current status if not already set
            if status is None:
                status = self.led_mode_manager.get_status()

            # Log the status being sent
            logger.info(f"Sending LED status to {sid}: mode={status.get('current_mode')}, has_viz={bool(status.get('visualization'))}")
            if status.get('visualization'):
                logger.info(f"Visualization details: {status['visualization']}")

            # Send acknowledgment with current status
            await self.sio.emit('led_status', {
                'success': True,
                'status': status
            }, room=sid)
            
        except Exception as e:
            logger.error(f"Error handling LED update: {e}", exc_info=True)
            await self.sio.emit('led_status', {
                'success': False,
                'error': str(e)
            }, room=sid)

    async def handle_led_brightness(self, sid: str, data: Dict):
        """Handle LED brightness changes"""
        session = self.sessions.get(sid)
        if not session:
            return

        try:
            brightness = data.get('brightness', 0.5)
            logger.info(f"LED brightness update from {sid}: {brightness:.0%}")

            # Update brightness on LED controller
            led_controller = get_led_controller()
            await led_controller.set_brightness(brightness)

            # Send confirmation back to client
            await self.sio.emit('led_status', {
                'success': True,
                'status': {
                    'brightness': brightness,
                    'current_mode': self.led_mode_manager.current_mode.value
                }
            }, room=sid)

        except Exception as e:
            logger.error(f"Error handling LED brightness: {e}", exc_info=True)
            await self.sio.emit('led_status', {
                'success': False,
                'error': str(e)
            }, room=sid)

    async def handle_visualization_control(self, sid: str, data: Dict):
        """Handle visualization control commands"""
        session = self.sessions.get(sid)
        if not session:
            return

        try:
            command = data.get('command')
            logger.info(f"Visualization control from {sid}: {command}")

            if command == 'select':
                # Select specific visualization
                viz_type = data.get('visualization_type')
                if viz_type:
                    await self.led_mode_manager.select_visualization(viz_type)

            elif command == 'set_duration':
                # Set visualization duration
                duration = data.get('duration', 60)
                await self.led_mode_manager.set_visualization_duration(duration)

            elif command == 'get_status':
                # Get current visualization status
                pass  # Status will be sent below

            # Send updated status
            status = self.led_mode_manager.get_status()

            # Log what we're sending
            logger.info(f"Visualization control response - mode={status.get('current_mode')}, has_viz={bool(status.get('visualization'))}")
            if status.get('visualization'):
                logger.info(f"Visualization details being sent: {status['visualization']}")

            await self.sio.emit('led_status', {
                'success': True,
                'status': status
            }, room=sid)

        except Exception as e:
            logger.error(f"Error handling visualization control: {e}", exc_info=True)
            await self.sio.emit('led_status', {
                'success': False,
                'error': str(e)
            }, room=sid)

    async def send_visualization_status(self, status: Dict):
        """Callback to send visualization status updates to all clients"""
        await self.sio.emit('visualization_status', status)

    async def start_background_tasks(self, app):
        """Start background tasks"""
        # Start NFC scanning
        if self.nfc_service.get_status()['hardware_available']:
            logger.info("Starting NFC continuous scanning")
            self.nfc_service.start_continuous_scanning(self.handle_tag_scanned)
            # Start queue processing in the main event loop
            asyncio.create_task(self.nfc_service.process_scan_queue())
        
        # Start session cleanup task
        asyncio.create_task(self._cleanup_sessions())
    
    async def _cleanup_sessions(self):
        """Periodically clean up inactive sessions"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                now = time.time()
                inactive_timeout = 300  # 5 minutes
                
                to_remove = []
                for sid, session in self.sessions.items():
                    if now - session.last_activity > inactive_timeout:
                        to_remove.append(sid)
                
                for sid in to_remove:
                    logger.info(f"Removing inactive session {sid}")
                    await self.sio.disconnect(sid)
                    
            except Exception as e:
                logger.error(f"Error in session cleanup: {e}")
    
    async def cleanup_background_tasks(self, app):
        """Cleanup background tasks"""
        logger.info("Cleaning up background tasks")
        self.nfc_service.stop_scanning()
    
    def run(self):
        """Run the server"""
        self.app.on_startup.append(self.start_background_tasks)
        self.app.on_cleanup.append(self.cleanup_background_tasks)
        
        logger.info("=" * 60)
        logger.info(f"NFC Collection Server v{self.version_info['server_version']}")
        logger.info(f"Build Time: {self.version_info['build_time']}")
        logger.info(f"Start Time: {self.version_info['start_time']}")
        logger.info("=" * 60)
        logger.info(f"Starting WebSocket server on {self.config.host}:{self.config.port}")
        nfc_status = self.nfc_service.get_status()
        logger.info(f"NFC Hardware Available: {nfc_status['hardware_available']}")
        logger.info(f"NFC Mock Mode: {nfc_status['mock_mode']}")
        logger.info(f"Configuration: {asdict(self.config)}")
        
        web.run_app(
            self.app,
            host=self.config.host,
            port=self.config.port,
            access_log=logger.getChild('access')
        )


def main():
    """Main entry point"""
    try:
        # Validate configuration
        config.validate()
        
        # Create and run server
        server = NFCWebSocketServer()
        server.run()
        
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        raise


if __name__ == '__main__':
    main()