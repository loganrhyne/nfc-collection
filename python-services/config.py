"""
Configuration management for NFC services
"""
import os
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()


@dataclass
class NFCConfig:
    """NFC hardware configuration"""
    spi_bus: int = 0
    cs_pin: str = "D25"
    mock_mode: bool = False
    scan_timeout: float = 30.0
    scan_debounce: float = 3.0
    write_cooldown: float = 10.0
    write_retry_attempts: int = 3
    write_retry_delay: float = 0.5
    max_tag_data_size: int = 144  # NTAG213 capacity
    
    @classmethod
    def from_env(cls) -> 'NFCConfig':
        """Create config from environment variables"""
        return cls(
            spi_bus=int(os.getenv('NFC_SPI_BUS', '0')),
            cs_pin=os.getenv('NFC_CS_PIN', 'D25'),
            mock_mode=os.getenv('NFC_MOCK_MODE', 'false').lower() == 'true',
            scan_timeout=float(os.getenv('NFC_SCAN_TIMEOUT', '30.0')),
            scan_debounce=float(os.getenv('NFC_SCAN_DEBOUNCE', '3.0')),
            write_cooldown=float(os.getenv('NFC_WRITE_COOLDOWN', '10.0')),
            write_retry_attempts=int(os.getenv('NFC_WRITE_RETRY_ATTEMPTS', '3')),
            write_retry_delay=float(os.getenv('NFC_WRITE_RETRY_DELAY', '0.5')),
            max_tag_data_size=int(os.getenv('NFC_MAX_TAG_DATA_SIZE', '144'))
        )


@dataclass
class ServerConfig:
    """WebSocket server configuration"""
    host: str = '0.0.0.0'
    port: int = 8000
    cors_origins: str = '*'  # Should be restricted in production
    heartbeat_interval: int = 30
    max_message_size: int = 1048576  # 1MB
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # seconds
    auth_enabled: bool = False
    auth_token: Optional[str] = None
    
    @classmethod
    def from_env(cls) -> 'ServerConfig':
        """Create config from environment variables"""
        return cls(
            host=os.getenv('WS_HOST', '0.0.0.0'),
            port=int(os.getenv('WS_PORT', '8000')),
            cors_origins=os.getenv('WS_CORS_ORIGINS', '*'),
            heartbeat_interval=int(os.getenv('WS_HEARTBEAT_INTERVAL', '30')),
            max_message_size=int(os.getenv('WS_MAX_MESSAGE_SIZE', '1048576')),
            rate_limit_enabled=os.getenv('WS_RATE_LIMIT_ENABLED', 'true').lower() == 'true',
            rate_limit_requests=int(os.getenv('WS_RATE_LIMIT_REQUESTS', '100')),
            rate_limit_window=int(os.getenv('WS_RATE_LIMIT_WINDOW', '60')),
            auth_enabled=os.getenv('WS_AUTH_ENABLED', 'false').lower() == 'true',
            auth_token=os.getenv('WS_AUTH_TOKEN')
        )


@dataclass
class LogConfig:
    """Logging configuration"""
    level: str = 'INFO'
    format: str = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    file: Optional[str] = None
    max_bytes: int = 10485760  # 10MB
    backup_count: int = 5
    
    @classmethod
    def from_env(cls) -> 'LogConfig':
        """Create config from environment variables"""
        return cls(
            level=os.getenv('LOG_LEVEL', 'INFO'),
            format=os.getenv('LOG_FORMAT', '%(asctime)s - %(name)s - %(levelname)s - %(message)s'),
            file=os.getenv('LOG_FILE'),
            max_bytes=int(os.getenv('LOG_MAX_BYTES', '10485760')),
            backup_count=int(os.getenv('LOG_BACKUP_COUNT', '5'))
        )


class Config:
    """Main configuration container"""
    def __init__(self):
        self.nfc = NFCConfig.from_env()
        self.server = ServerConfig.from_env()
        self.log = LogConfig.from_env()
    
    @classmethod
    def load(cls) -> 'Config':
        """Load configuration from environment"""
        return cls()
    
    def validate(self) -> None:
        """Validate configuration"""
        # Add validation logic here
        if self.server.auth_enabled and not self.server.auth_token:
            raise ValueError("Auth enabled but no token provided")
        
        if self.server.port < 1 or self.server.port > 65535:
            raise ValueError(f"Invalid port: {self.server.port}")
        
        if self.nfc.max_tag_data_size > 888:  # NTAG216 max
            raise ValueError(f"Tag data size too large: {self.nfc.max_tag_data_size}")


# Global config instance
config = Config.load()