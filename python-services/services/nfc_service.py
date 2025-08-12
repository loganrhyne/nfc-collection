#!/usr/bin/env python3
"""
NFC Service for reading and writing NTAG tags
"""

import asyncio
import json
import logging
import time
import threading
from typing import Optional, Dict, Any

try:
    import board
    import busio
    from digitalio import DigitalInOut
    from adafruit_pn532.spi import PN532_SPI
    HARDWARE_AVAILABLE = True
except ImportError:
    HARDWARE_AVAILABLE = False
    logging.warning("NFC hardware libraries not available")

logger = logging.getLogger(__name__)

class NFCService:
    def __init__(self, mock_mode=False):
        self.pn532 = None
        self.is_waiting = False
        self.cancel_flag = False
        self.mock_mode = mock_mode or not HARDWARE_AVAILABLE
        
        if HARDWARE_AVAILABLE and not mock_mode:
            self._initialize_hardware()
        elif self.mock_mode:
            logger.info("NFC Service running in mock mode")
    
    def _initialize_hardware(self):
        """Initialize PN532 hardware"""
        try:
            spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
            cs_pin = DigitalInOut(board.D25)
            self.pn532 = PN532_SPI(spi, cs_pin, debug=False)
            
            # Check firmware
            ic, ver, rev, support = self.pn532.firmware_version
            logger.info(f"PN532 Firmware Version: {ver}.{rev}")
            
            # Configure
            self.pn532.SAM_configuration()
            logger.info("NFC hardware initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize NFC hardware: {e}")
            self.pn532 = None
    
    async def wait_for_tag(self, timeout: int = 30) -> Optional[str]:
        """Wait for an NFC tag to be placed on reader"""
        if self.mock_mode:
            # In mock mode, simulate tag detection after 2 seconds
            await asyncio.sleep(2)
            mock_uid = "01:23:45:67:89:AB:CD"
            logger.info(f"Mock tag detected: {mock_uid}")
            return mock_uid
            
        if not self.pn532:
            raise Exception("NFC hardware not available")
        
        self.is_waiting = True
        self.cancel_flag = False
        start_time = time.time()
        
        try:
            while self.is_waiting and not self.cancel_flag:
                # Check timeout
                if time.time() - start_time > timeout:
                    return None
                
                # Try to read tag (non-blocking)
                uid = await asyncio.get_event_loop().run_in_executor(
                    None, 
                    lambda: self.pn532.read_passive_target(timeout=0.5)
                )
                
                if uid:
                    # Convert UID to string format
                    uid_str = ':'.join([f"{b:02X}" for b in uid])
                    logger.info(f"Tag detected: {uid_str}")
                    return uid_str
                
                # Small delay before next attempt
                await asyncio.sleep(0.1)
                
        finally:
            self.is_waiting = False
        
        return None
    
    async def write_json_to_tag(self, uid_str: str, data: Dict[str, Any]) -> bool:
        """Write JSON data to NFC tag"""
        if self.mock_mode:
            # In mock mode, simulate successful write after 1 second
            await asyncio.sleep(1)
            logger.info(f"Mock write to tag {uid_str}: {data}")
            return True
            
        if not self.pn532:
            raise Exception("NFC hardware not available")
        
        try:
            # Run synchronous write in executor
            loop = asyncio.get_event_loop()
            success = await loop.run_in_executor(
                None,
                self._write_json_to_tag_sync,
                uid_str,
                data
            )
            return success
            
        except Exception as e:
            logger.error(f"Error writing to tag: {e}")
            return False
    
    def _write_json_to_tag_sync(self, uid_str: str, data: Dict[str, Any]) -> bool:
        """Synchronous version of write_json_to_tag"""
        try:
            # Convert JSON to compact string
            json_str = json.dumps(data, separators=(',', ':'))
            logger.info(f"Writing JSON to tag: {json_str} ({len(json_str)} bytes)")
            
            # Check if tag is still present
            uid = self.pn532.read_passive_target()
            if not uid:
                logger.error("No tag detected for writing")
                return False
            
            detected_uid = ':'.join([f"{b:02X}" for b in uid])
            logger.info(f"Tag detected for writing: {detected_uid}")
            
            # Create NDEF message
            ndef_data = self._create_text_ndef(json_str)
            logger.info(f"NDEF data size: {len(ndef_data)} bytes")
            
            # Write to tag synchronously
            success = self._write_ndef_data_sync(ndef_data)
            
            if success:
                logger.info(f"Successfully wrote {len(json_str)} bytes to tag")
                
                # Verify write by reading back
                verify_data = self._read_json_from_tag_sync()
                if verify_data:
                    logger.info(f"Verification read: {verify_data}")
                else:
                    logger.warning("Could not verify write - unable to read back data")
            else:
                logger.error("Failed to write to tag")
                
            return success
            
        except Exception as e:
            logger.error(f"Error in sync write: {e}", exc_info=True)
            return False
    
    def _create_text_ndef(self, text: str) -> bytes:
        """Create NDEF text record"""
        # Text record format
        text_bytes = text.encode('utf-8')
        
        # NDEF record
        ndef_flags = 0xD1  # MB=1, ME=1, SR=1, TNF=0x01
        type_length = 0x01
        payload_length = len(text_bytes) + 3  # +3 for status byte and "en"
        type_field = ord('T')
        
        # Text record payload: status byte + language + text
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
    
    async def _write_ndef_data(self, ndef_data: bytes) -> bool:
        """Write NDEF data to tag"""
        try:
            # Clear existing data first
            for page in range(4, 8):
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    self.pn532.ntag2xx_write_block,
                    page,
                    [0x00, 0x00, 0x00, 0x00]
                )
                await asyncio.sleep(0.1)
            
            # Write new data
            start_page = 4
            pages_needed = (len(ndef_data) + 3) // 4
            
            for page_num in range(pages_needed):
                actual_page = start_page + page_num
                
                # Get page data
                start_idx = page_num * 4
                end_idx = min(start_idx + 4, len(ndef_data))
                page_data = list(ndef_data[start_idx:end_idx])
                
                # Pad to 4 bytes
                while len(page_data) < 4:
                    page_data.append(0x00)
                
                # Write page
                success = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self.pn532.ntag2xx_write_block,
                    actual_page,
                    page_data
                )
                
                if not success:
                    return False
                
                await asyncio.sleep(0.05)
            
            return True
            
        except Exception as e:
            logger.error(f"Error writing NDEF data: {e}")
            return False
    
    def cancel_registration(self):
        """Cancel ongoing tag wait"""
        self.cancel_flag = True
        self.is_waiting = False
    
    async def start_continuous_scanning(self, callback):
        """Start continuous scanning for tags"""
        logger.info(f"Starting continuous NFC scanning (mock_mode={self.mock_mode})")
        self.cancel_flag = False
        self.callback = callback
        self.loop = asyncio.get_event_loop()
        
        if self.mock_mode:
            # Mock mode - use async loop
            asyncio.create_task(self._mock_scan_loop())
        else:
            # Real hardware - use thread
            self.scan_thread = threading.Thread(target=self._hardware_scan_loop)
            self.scan_thread.daemon = True
            self.scan_thread.start()
    
    async def _mock_scan_loop(self):
        """Mock scanning loop for testing"""
        while not self.cancel_flag:
            await asyncio.sleep(5)
            if not self.cancel_flag:
                mock_data = {
                    'v': 1,
                    'id': '1A88256FB33855EEB831ED2569B135CF',
                    'geo': [-33.890542, 151.274856],
                    'ts': 1652397920
                }
                await self.callback(mock_data)
    
    def _hardware_scan_loop(self):
        """Hardware scanning loop that runs in a thread"""
        logger.info("Starting hardware scan loop in thread")
        last_uid = None
        last_read_time = 0
        
        while not self.cancel_flag:
            try:
                # Simple blocking read
                uid = self.pn532.read_passive_target()
                
                if uid:
                    current_time = time.time()
                    # Debounce - ignore same tag for 3 seconds
                    if uid != last_uid or current_time - last_read_time > 3:
                        last_uid = uid
                        last_read_time = current_time
                        
                        uid_str = ':'.join([f"{b:02X}" for b in uid])
                        logger.info(f"Tag detected: {uid_str}")
                        
                        # Read JSON data synchronously
                        json_data = self._read_json_from_tag_sync()
                        if json_data:
                            # Schedule callback in async context
                            asyncio.run_coroutine_threadsafe(
                                self.callback(json_data),
                                self.loop
                            )
                
                # Short delay
                time.sleep(0.5)
                
            except Exception as e:
                logger.error(f"Error in hardware scan loop: {e}")
                time.sleep(1)
    
    async def read_json_from_tag(self, uid) -> Optional[Dict[str, Any]]:
        """Read JSON data from NFC tag"""
        if self.mock_mode:
            return None
            
        try:
            # Read NDEF data from tag
            data = bytearray()
            for page in range(4, 15):  # Read more pages for full data
                block = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self.pn532.ntag2xx_read_block,
                    page
                )
                if block:
                    data.extend(block)
            
            # Find JSON data (look for '{' character)
            if b'{' in data:
                json_start = data.find(b'{')
                json_end = data.find(b'}', json_start) + 1
                
                if json_end > json_start:
                    json_str = data[json_start:json_end].decode('utf-8', errors='ignore')
                    return json.loads(json_str)
            
            return None
            
        except Exception as e:
            logger.error(f"Error reading JSON from tag: {e}")
            return None
    
    def stop_scanning(self):
        """Stop continuous scanning"""
        self.cancel_flag = True
        if hasattr(self, 'scan_thread') and self.scan_thread:
            self.scan_thread.join(timeout=2)
    
    def _read_json_from_tag_sync(self) -> Optional[Dict[str, Any]]:
        """Read JSON data from tag (synchronous version for thread)"""
        try:
            # Read NDEF data from tag - read more pages for full data
            data = bytearray()
            for page in range(4, 40):  # Read up to page 39
                block = self.pn532.ntag2xx_read_block(page)
                if block:
                    data.extend(block)
                else:
                    break
            
            logger.debug(f"Raw data read from tag: {data[:120].hex()}")
            
            # Parse NDEF TLV structure
            # Look for NDEF message TLV (0x03)
            if len(data) > 2 and data[0] == 0x03:
                # Get NDEF message length
                if data[1] == 0xFF:
                    # 3-byte length format
                    if len(data) > 4:
                        ndef_len = (data[2] << 8) | data[3]
                        ndef_start = 4
                else:
                    # 1-byte length format
                    ndef_len = data[1]
                    ndef_start = 2
                
                logger.debug(f"NDEF message found, length: {ndef_len}, start: {ndef_start}")
                
                # Extract NDEF message
                if len(data) >= ndef_start + ndef_len:
                    ndef_message = data[ndef_start:ndef_start + ndef_len]
                    
                    # Parse NDEF record (simplified - assumes single text record)
                    if len(ndef_message) > 5:
                        # Skip NDEF header (5 bytes) and language code
                        # Record format: [flags, type_len, payload_len, type, status_byte]
                        payload_len = ndef_message[2]
                        # Skip header (5 bytes) + status byte (1) + language code (2)
                        text_start = 5 + 1 + 2
                        
                        if len(ndef_message) >= text_start:
                            text_data = ndef_message[text_start:text_start + payload_len - 3]
                            text_str = text_data.decode('utf-8', errors='ignore')
                            logger.debug(f"Extracted text: {text_str}")
                            
                            # Parse JSON
                            if text_str.startswith('{'):
                                return json.loads(text_str)
            
            # Fallback: Look for raw JSON (for tags written by other tools)
            if b'{' in data:
                json_start = data.find(b'{')
                json_end = data.find(b'}', json_start) + 1
                
                if json_end > json_start:
                    json_str = data[json_start:json_end].decode('utf-8', errors='ignore')
                    logger.debug(f"Found raw JSON: {json_str}")
                    return json.loads(json_str)
            
            # If no JSON found, log what we did find
            logger.warning(f"No JSON found on tag. First 32 bytes: {data[:32].hex()}")
            return None
            
        except Exception as e:
            logger.error(f"Error reading JSON from tag: {e}", exc_info=True)
            return None
    
    def _write_ndef_data_sync(self, ndef_data: bytes) -> bool:
        """Write NDEF data to tag (synchronous version)"""
        try:
            logger.info("Starting NDEF write...")
            
            # NTAG213 has 45 pages (4 bytes each), user memory starts at page 4
            # Maximum writable pages: 4-39 (36 pages = 144 bytes)
            if len(ndef_data) > 144:
                logger.error(f"NDEF data too large: {len(ndef_data)} bytes (max 144)")
                return False
            
            # Clear existing data first (pages 4-7 for header area)
            logger.info("Clearing tag header...")
            for page in range(4, 8):
                success = self.pn532.ntag2xx_write_block(page, [0x00, 0x00, 0x00, 0x00])
                if not success:
                    logger.error(f"Failed to clear page {page}")
                    return False
                time.sleep(0.05)  # Small delay between writes
            
            # Write new data
            start_page = 4
            pages_needed = (len(ndef_data) + 3) // 4  # Round up
            logger.info(f"Writing {pages_needed} pages starting at page {start_page}")
            
            for page_num in range(pages_needed):
                actual_page = start_page + page_num
                
                # Don't write past page 39
                if actual_page > 39:
                    logger.warning(f"Reached end of user memory at page {actual_page}")
                    break
                
                # Get page data
                start_idx = page_num * 4
                end_idx = min(start_idx + 4, len(ndef_data))
                page_data = list(ndef_data[start_idx:end_idx])
                
                # Pad to 4 bytes
                while len(page_data) < 4:
                    page_data.append(0x00)
                
                logger.debug(f"Writing page {actual_page}: {[hex(b) for b in page_data]}")
                
                # Write page
                success = self.pn532.ntag2xx_write_block(actual_page, page_data)
                
                if not success:
                    logger.error(f"Failed to write page {actual_page}")
                    return False
                
                time.sleep(0.05)  # Delay between writes
            
            logger.info("NDEF write completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error writing NDEF data: {e}", exc_info=True)
            return False