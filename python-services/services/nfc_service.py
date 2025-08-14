#!/usr/bin/env python3
"""
Refactored NFC Service with enterprise-grade error handling and configuration
"""

import asyncio
import json
import logging
import time
import threading
from contextlib import contextmanager
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Optional, Dict, Any, Callable, Union
from threading import Lock

try:
    import board
    import busio
    from digitalio import DigitalInOut
    from adafruit_pn532.spi import PN532_SPI
    HARDWARE_AVAILABLE = True
except ImportError:
    HARDWARE_AVAILABLE = False
    logging.warning("NFC hardware libraries not available")

from config import config

logger = logging.getLogger(__name__)


class NFCError(Exception):
    """Base exception for NFC operations"""
    pass


class NFCHardwareError(NFCError):
    """Hardware-related errors"""
    pass


class NFCDataError(NFCError):
    """Data validation/format errors"""
    pass


class NFCTimeoutError(NFCError):
    """Operation timeout errors"""
    pass


class TagType(Enum):
    """Supported NFC tag types"""
    NTAG213 = "ntag213"
    NTAG215 = "ntag215"
    NTAG216 = "ntag216"
    UNKNOWN = "unknown"
    
    @property
    def capacity(self) -> int:
        """Get tag capacity in bytes"""
        capacities = {
            TagType.NTAG213: 144,
            TagType.NTAG215: 496,
            TagType.NTAG216: 872,
            TagType.UNKNOWN: 0
        }
        return capacities.get(self, 0)


@dataclass
class TagInfo:
    """NFC tag information"""
    uid: str
    type: TagType
    capacity: int
    locked: bool = False
    data: Optional[Dict[str, Any]] = None


@dataclass
class WriteResult:
    """Result of write operation"""
    success: bool
    tag_uid: str
    bytes_written: int
    error: Optional[str] = None
    retry_count: int = 0


class NFCService:
    """Enterprise-grade NFC service with robust error handling"""
    
    def __init__(self, nfc_config=None):
        self.config = nfc_config or config.nfc
        self._lock = Lock()
        self._pn532 = None
        self._is_scanning = False
        self._scan_thread = None
        self._last_written_uid = None
        self._last_write_time = 0
        self._write_cooldown_cache = {}  # uid -> timestamp
        
        # Initialize hardware if not in mock mode
        if not self.config.mock_mode:
            self._initialize_hardware()
    
    def _initialize_hardware(self) -> None:
        """Initialize NFC hardware with retry logic"""
        if not HARDWARE_AVAILABLE:
            logger.error("NFC hardware libraries not available")
            raise NFCHardwareError("Required hardware libraries not installed")
        
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                logger.info(f"Initializing NFC hardware (attempt {attempt + 1}/{max_attempts})")
                
                # Initialize SPI and PN532
                spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
                cs_pin = DigitalInOut(getattr(board, self.config.cs_pin))
                self._pn532 = PN532_SPI(spi, cs_pin, debug=False)
                
                # Verify connection
                ic, ver, rev, support = self._pn532.firmware_version
                logger.info(f"PN532 Firmware Version: {ver}.{rev}")
                
                # Configure SAM
                self._pn532.SAM_configuration()
                logger.info("NFC hardware initialized successfully")
                return
                
            except Exception as e:
                logger.error(f"Hardware initialization attempt {attempt + 1} failed: {e}")
                if attempt < max_attempts - 1:
                    time.sleep(1)
                else:
                    raise NFCHardwareError(f"Failed to initialize hardware after {max_attempts} attempts: {e}")
    
    @contextmanager
    def _hardware_lock(self):
        """Context manager for thread-safe hardware access"""
        self._lock.acquire()
        try:
            yield
        finally:
            self._lock.release()
    
    def detect_tag_type(self, uid: bytes) -> TagType:
        """Detect NFC tag type based on UID and other characteristics"""
        # Simplified detection - in production, would check SAK/ATQA values
        if len(uid) == 7:
            # Likely NTAG series
            return TagType.NTAG213  # Would need more info to distinguish
        return TagType.UNKNOWN
    
    def validate_json_data(self, data: Dict[str, Any]) -> None:
        """Validate JSON data before writing to tag"""
        if not isinstance(data, dict):
            raise NFCDataError("Data must be a dictionary")
        
        # Check required fields
        required_fields = ['v', 'id', 'geo', 'ts']
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            raise NFCDataError(f"Missing required fields: {missing_fields}")
        
        # Validate data types
        if not isinstance(data['v'], int):
            raise NFCDataError("Version 'v' must be an integer")
        
        if not isinstance(data['geo'], list) or len(data['geo']) != 2:
            raise NFCDataError("Geo 'geo' must be a list of two numbers")
        
        if not isinstance(data['ts'], (int, float)):
            raise NFCDataError("Timestamp 'ts' must be a number")
        
        # Check data size
        json_str = json.dumps(data, separators=(',', ':'))
        if len(json_str.encode('utf-8')) > self.config.max_tag_data_size - 20:  # Reserve space for NDEF headers
            raise NFCDataError(f"Data too large for tag: {len(json_str)} bytes")
    
    async def wait_for_tag(self, timeout: Optional[float] = None) -> Optional[TagInfo]:
        """Wait for tag with timeout and proper error handling"""
        timeout = timeout or self.config.scan_timeout
        
        if self.config.mock_mode:
            await asyncio.sleep(2)
            return TagInfo(
                uid="01:23:45:67:89:AB:CD",
                type=TagType.NTAG213,
                capacity=144,
                locked=False
            )
        
        with self._hardware_lock():
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                try:
                    uid = await asyncio.get_event_loop().run_in_executor(
                        None, 
                        lambda: self._pn532.read_passive_target(timeout=500)  # 500ms timeout
                    )
                    
                    if uid:
                        uid_str = ':'.join([f"{b:02X}" for b in uid])
                        tag_type = self.detect_tag_type(uid)
                        
                        logger.info(f"Tag detected: {uid_str} (type: {tag_type.value})")
                        
                        return TagInfo(
                            uid=uid_str,
                            type=tag_type,
                            capacity=tag_type.capacity,
                            locked=False  # Would check lock status in production
                        )
                    
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    logger.error(f"Error during tag detection: {e}")
                    raise NFCHardwareError(f"Tag detection failed: {e}")
            
            raise NFCTimeoutError(f"No tag detected within {timeout} seconds")
    
    async def write_json_to_tag(self, tag_info: TagInfo, data: Dict[str, Any]) -> WriteResult:
        """Write JSON data to tag with validation and retry logic"""
        # Validate data first
        try:
            self.validate_json_data(data)
        except NFCDataError as e:
            return WriteResult(
                success=False,
                tag_uid=tag_info.uid,
                bytes_written=0,
                error=str(e)
            )
        
        if self.config.mock_mode:
            await asyncio.sleep(1)
            return WriteResult(
                success=True,
                tag_uid=tag_info.uid,
                bytes_written=len(json.dumps(data)),
                retry_count=0
            )
        
        # Actual write with retry logic
        for attempt in range(self.config.write_retry_attempts):
            try:
                result = await self._write_with_verification(tag_info, data)
                if result.success:
                    # Update cooldown cache
                    self._write_cooldown_cache[tag_info.uid] = time.time()
                    return result
                
                if attempt < self.config.write_retry_attempts - 1:
                    await asyncio.sleep(self.config.write_retry_delay)
                    
            except Exception as e:
                logger.error(f"Write attempt {attempt + 1} failed: {e}")
                if attempt == self.config.write_retry_attempts - 1:
                    return WriteResult(
                        success=False,
                        tag_uid=tag_info.uid,
                        bytes_written=0,
                        error=str(e),
                        retry_count=attempt + 1
                    )
        
        return WriteResult(
            success=False,
            tag_uid=tag_info.uid,
            bytes_written=0,
            error="All write attempts failed",
            retry_count=self.config.write_retry_attempts
        )
    
    async def _write_with_verification(self, tag_info: TagInfo, data: Dict[str, Any]) -> WriteResult:
        """Write data and verify it was written correctly"""
        json_str = json.dumps(data, separators=(',', ':'))
        ndef_data = self._create_text_ndef(json_str)
        
        if len(ndef_data) > tag_info.capacity:
            raise NFCDataError(f"NDEF data ({len(ndef_data)} bytes) exceeds tag capacity ({tag_info.capacity} bytes)")
        
        # Write data
        with self._hardware_lock():
            success = await asyncio.get_event_loop().run_in_executor(
                None,
                self._write_ndef_data_sync,
                ndef_data
            )
        
        if not success:
            return WriteResult(
                success=False,
                tag_uid=tag_info.uid,
                bytes_written=0,
                error="Failed to write NDEF data"
            )
        
        # Verify write
        read_data = await self.read_json_from_tag(tag_info)
        if read_data == data:
            logger.info(f"Successfully wrote and verified {len(json_str)} bytes to tag {tag_info.uid}")
            return WriteResult(
                success=True,
                tag_uid=tag_info.uid,
                bytes_written=len(json_str)
            )
        else:
            return WriteResult(
                success=False,
                tag_uid=tag_info.uid,
                bytes_written=len(json_str),
                error="Verification failed - data mismatch"
            )
    
    async def read_json_from_tag(self, tag_info: TagInfo) -> Optional[Dict[str, Any]]:
        """Read and parse JSON data from tag"""
        if self.config.mock_mode:
            return {
                'v': 1,
                'id': '1A88256FB33855EEB831ED2569B135CF',
                'geo': [-33.890542, 151.274856],
                'ts': 1652397920
            }
        
        with self._hardware_lock():
            data = await asyncio.get_event_loop().run_in_executor(
                None,
                self._read_json_from_tag_sync
            )
        
        return data
    
    def start_continuous_scanning(self, callback: Callable[[Dict[str, Any]], Any]) -> None:
        """Start continuous scanning with improved error handling"""
        if self._is_scanning:
            logger.warning("Scanning already in progress")
            return
        
        self._is_scanning = True
        self._scan_thread = threading.Thread(
            target=self._scanning_loop,
            args=(callback,),
            daemon=True
        )
        self._scan_thread.start()
        logger.info("Continuous scanning started")
    
    def stop_scanning(self) -> None:
        """Stop continuous scanning gracefully"""
        if not self._is_scanning:
            return
        
        logger.info("Stopping continuous scanning...")
        self._is_scanning = False
        
        if self._scan_thread:
            self._scan_thread.join(timeout=5)
            if self._scan_thread.is_alive():
                logger.warning("Scan thread did not stop gracefully")
        
        logger.info("Continuous scanning stopped")
    
    def _scanning_loop(self, callback: Callable) -> None:
        """Improved scanning loop with error recovery"""
        last_uid = None
        last_scan_time = 0
        error_count = 0
        max_consecutive_errors = 5
        
        while self._is_scanning:
            try:
                if self.config.mock_mode:
                    time.sleep(5)
                    if self._is_scanning:
                        asyncio.run(callback({
                            'v': 1,
                            'id': '1A88256FB33855EEB831ED2569B135CF',
                            'geo': [-33.890542, 151.274856],
                            'ts': int(time.time())
                        }))
                    continue
                
                with self._hardware_lock():
                    uid = self._pn532.read_passive_target(timeout=500)  # 500ms timeout
                
                if uid:
                    current_time = time.time()
                    uid_str = ':'.join([f"{b:02X}" for b in uid])
                    
                    # Check cooldown
                    if uid_str in self._write_cooldown_cache:
                        cooldown_end = self._write_cooldown_cache[uid_str] + self.config.write_cooldown
                        if current_time < cooldown_end:
                            continue
                        else:
                            # Remove from cache after cooldown
                            del self._write_cooldown_cache[uid_str]
                    
                    # Debounce check
                    if uid_str != last_uid or current_time - last_scan_time > self.config.scan_debounce:
                        last_uid = uid_str
                        last_scan_time = current_time
                        
                        try:
                            # Read tag data
                            with self._hardware_lock():
                                json_data = self._read_json_from_tag_sync()
                            
                            if json_data:
                                logger.info(f"Tag scanned: {uid_str}")
                                asyncio.run(callback(json_data))
                                error_count = 0  # Reset error count on success
                        except Exception as e:
                            logger.error(f"Error reading tag data: {e}")
                
                time.sleep(0.5)
                
            except Exception as e:
                error_count += 1
                logger.error(f"Error in scanning loop (count: {error_count}): {e}")
                
                if error_count >= max_consecutive_errors:
                    logger.error("Too many consecutive errors, reinitializing hardware...")
                    try:
                        self._initialize_hardware()
                        error_count = 0
                    except Exception as init_error:
                        logger.error(f"Failed to reinitialize hardware: {init_error}")
                        time.sleep(5)  # Wait before retrying
                
                time.sleep(1)
    
    def _create_text_ndef(self, text: str) -> bytes:
        """Create NDEF text record (unchanged from original)"""
        text_bytes = text.encode('utf-8')
        
        # NDEF record
        ndef_flags = 0xD1  # MB=1, ME=1, SR=1, TNF=0x01
        type_length = 0x01
        payload_length = len(text_bytes) + 3  # +3 for status byte and "en"
        type_field = ord('T')
        
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
        
        # Add TLV wrapper
        if len(ndef_message) < 255:
            ndef_data = bytes([0x03, len(ndef_message)]) + ndef_message + bytes([0xFE])
        else:
            ndef_data = bytes([0x03, 0xFF, 
                             (len(ndef_message) >> 8) & 0xFF,
                             len(ndef_message) & 0xFF]) + ndef_message + bytes([0xFE])
        
        return ndef_data
    
    def _write_ndef_data_sync(self, ndef_data: bytes) -> bool:
        """Synchronous NDEF write (unchanged from original)"""
        try:
            logger.debug(f"Writing {len(ndef_data)} bytes of NDEF data")
            
            # Clear existing data
            for page in range(4, 8):
                success = self._pn532.ntag2xx_write_block(page, [0x00, 0x00, 0x00, 0x00])
                if not success:
                    return False
                time.sleep(0.05)
            
            # Write new data
            start_page = 4
            pages_needed = (len(ndef_data) + 3) // 4
            
            for page_num in range(pages_needed):
                actual_page = start_page + page_num
                
                if actual_page > 39:  # NTAG213 limit
                    break
                
                start_idx = page_num * 4
                end_idx = min(start_idx + 4, len(ndef_data))
                page_data = list(ndef_data[start_idx:end_idx])
                
                while len(page_data) < 4:
                    page_data.append(0x00)
                
                success = self._pn532.ntag2xx_write_block(actual_page, page_data)
                if not success:
                    return False
                
                time.sleep(0.05)
            
            return True
            
        except Exception as e:
            logger.error(f"Error writing NDEF data: {e}")
            return False
    
    def _read_json_from_tag_sync(self) -> Optional[Dict[str, Any]]:
        """Synchronous JSON read with improved error handling"""
        try:
            # Read data from tag
            data = bytearray()
            for page in range(4, 40):
                block = self._pn532.ntag2xx_read_block(page)
                if block:
                    data.extend(block)
                else:
                    break
            
            # Parse NDEF TLV structure (unchanged logic)
            if len(data) > 2 and data[0] == 0x03:
                if data[1] == 0xFF:
                    if len(data) > 4:
                        ndef_len = (data[2] << 8) | data[3]
                        ndef_start = 4
                else:
                    ndef_len = data[1]
                    ndef_start = 2
                
                if len(data) >= ndef_start + ndef_len:
                    ndef_message = data[ndef_start:ndef_start + ndef_len]
                    
                    if len(ndef_message) > 5 and ndef_message[3] == 0x54:  # 'T' record
                        payload_len = ndef_message[2]
                        status_byte = ndef_message[4]
                        lang_len = status_byte & 0x3F
                        
                        text_start = 5 + lang_len
                        text_end = 4 + payload_len
                        
                        if len(ndef_message) >= text_end:
                            text_data = ndef_message[text_start:text_end]
                            text_str = text_data.decode('utf-8', errors='ignore')
                            
                            if text_str.startswith('{'):
                                return json.loads(text_str)
            
            logger.warning("No valid JSON found on tag")
            return None
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON on tag: {e}")
            return None
        except Exception as e:
            logger.error(f"Error reading tag: {e}")
            return None
    
    def get_status(self) -> Dict[str, Any]:
        """Get service status information"""
        return {
            'hardware_available': HARDWARE_AVAILABLE and self._pn532 is not None,
            'mock_mode': self.config.mock_mode,
            'is_scanning': self._is_scanning,
            'cooldown_cache_size': len(self._write_cooldown_cache),
            'config': asdict(self.config)
        }