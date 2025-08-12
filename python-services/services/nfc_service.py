#!/usr/bin/env python3
"""
NFC Service for reading and writing NTAG tags
"""

import asyncio
import json
import logging
import time
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
                    self.pn532.read_passive_target,
                    0.5  # 500ms timeout for each attempt
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
            # Convert JSON to compact string
            json_str = json.dumps(data, separators=(',', ':'))
            
            # Create NDEF message
            ndef_data = self._create_text_ndef(json_str)
            
            # Write to tag
            success = await self._write_ndef_data(ndef_data)
            
            if success:
                logger.info(f"Successfully wrote {len(json_str)} bytes to tag")
            else:
                logger.error("Failed to write to tag")
                
            return success
            
        except Exception as e:
            logger.error(f"Error writing to tag: {e}")
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
        self.cancel_flag = False  # Reset the flag
        last_uid = None
        last_read_time = 0
        
        while not self.cancel_flag:
            try:
                if self.mock_mode:
                    # In mock mode, simulate occasional tag scans
                    await asyncio.sleep(5)
                    if not self.cancel_flag:
                        mock_data = {
                            'v': 1,
                            'id': '1A88256FB33855EEB831ED2569B135CF',
                            'geo': [-33.890542, 151.274856],
                            'ts': 1652397920
                        }
                        await callback(mock_data)
                else:
                    # Real hardware scanning
                    uid = await asyncio.get_event_loop().run_in_executor(
                        None, 
                        self.pn532.read_passive_target,
                        0.1  # 100ms timeout
                    )
                    
                    if uid:
                        current_time = time.time()
                        # Debounce - ignore same tag for 3 seconds
                        if uid != last_uid or current_time - last_read_time > 3:
                            last_uid = uid
                            last_read_time = current_time
                            
                            # Try to read NDEF data
                            try:
                                json_data = await self.read_json_from_tag(uid)
                                if json_data:
                                    await callback(json_data)
                            except Exception as e:
                                logger.error(f"Error reading tag data: {e}")
                
                # Low-power delay
                await asyncio.sleep(0.5)
                
            except Exception as e:
                logger.error(f"Error in continuous scanning: {e}")
                await asyncio.sleep(1)
    
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