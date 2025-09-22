"""
Minimal configuration for NFC Collection services
"""
import os
from dataclasses import dataclass

@dataclass
class NFCConfig:
    """NFC service configuration"""
    mock_mode: bool = False
    cs_pin: str = 'D25'
    max_tag_data_size: int = 512
    scan_timeout: float = 30.0
    write_retry_attempts: int = 3
    write_retry_delay: float = 0.5

class Config:
    """Main configuration object"""
    def __init__(self):
        self.nfc = NFCConfig(
            mock_mode=os.getenv('NFC_MOCK_MODE', 'false').lower() == 'true'
        )

# Global config instance
config = Config()