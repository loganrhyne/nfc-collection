#!/usr/bin/env python3
"""
Simplified NFC Service for debugging
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

class NFCServiceSimple:
    def __init__(self):
        self.pn532 = None
        self.scanning = False
        self.scan_thread = None
        self.callback = None
        
        if HARDWARE_AVAILABLE:
            self._initialize_hardware()
    
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
    
    def _scan_loop(self):
        """Synchronous scanning loop that runs in a thread"""
        logger.info("Starting synchronous scan loop")
        last_uid = None
        last_read_time = 0
        
        while self.scanning:
            try:
                # Simple blocking read with short timeout
                uid = self.pn532.read_passive_target()
                
                if uid:
                    current_time = time.time()
                    # Debounce - ignore same tag for 3 seconds
                    if uid != last_uid or current_time - last_read_time > 3:
                        last_uid = uid
                        last_read_time = current_time
                        
                        uid_str = ':'.join([f"{b:02X}" for b in uid])
                        logger.info(f"Tag detected: {uid_str}")
                        
                        # Try to read JSON data
                        json_data = self._read_json_from_tag()
                        if json_data and self.callback:
                            # Schedule callback in async context
                            asyncio.run_coroutine_threadsafe(
                                self.callback(json_data),
                                self.loop
                            )
                
                # Short delay
                time.sleep(0.5)
                
            except Exception as e:
                logger.error(f"Error in scan loop: {e}")
                time.sleep(1)
    
    def _read_json_from_tag(self) -> Optional[Dict[str, Any]]:
        """Read JSON data from tag (synchronous)"""
        try:
            # Read NDEF data from tag
            data = bytearray()
            for page in range(4, 15):
                block = self.pn532.ntag2xx_read_block(page)
                if block:
                    data.extend(block)
            
            # Find JSON data
            if b'{' in data:
                json_start = data.find(b'{')
                json_end = data.find(b'}', json_start) + 1
                
                if json_end > json_start:
                    json_str = data[json_start:json_end].decode('utf-8', errors='ignore')
                    return json.loads(json_str)
            
            # If no JSON found, create mock data for testing
            logger.info("No JSON found on tag, using mock data")
            return {
                'v': 1,
                'id': 'TEST-ENTRY-ID',
                'geo': [0, 0],
                'ts': int(time.time())
            }
            
        except Exception as e:
            logger.error(f"Error reading JSON from tag: {e}")
            return None
    
    async def start_continuous_scanning(self, callback):
        """Start continuous scanning with async callback"""
        if not self.pn532:
            logger.error("No NFC hardware available")
            return
            
        logger.info("Starting continuous NFC scanning (simple mode)")
        self.scanning = True
        self.callback = callback
        self.loop = asyncio.get_event_loop()
        
        # Start scan thread
        self.scan_thread = threading.Thread(target=self._scan_loop)
        self.scan_thread.daemon = True
        self.scan_thread.start()
    
    def stop_scanning(self):
        """Stop scanning"""
        logger.info("Stopping NFC scanning")
        self.scanning = False
        if self.scan_thread:
            self.scan_thread.join(timeout=2)