# WebSocket Implementation Notes

## Technical Stack

### Python Server
- **WebSocket Library**: `websockets` or `python-socketio` 
  - Recommend `python-socketio` for better event handling and reconnection support
- **Async Framework**: `asyncio` for concurrent operations
- **Hardware Libraries**: 
  - `adafruit-circuitpython-pn532` (existing)
  - `rpi_ws281x` (existing)
- **Dependencies**:
  ```
  python-socketio[asyncio_server]
  aiofiles  # For async file operations
  pydantic  # For message validation
  ```

### React Client
- **WebSocket Client**: `socket.io-client`
- **State Management**: Context API + useReducer for WebSocket state
- **UI Components**: Existing styled-components setup

## Implementation Details

### 1. Python Server Structure

```python
# server.py - Main entry point
import asyncio
import socketio
from services import NFCService, LEDService
from handlers import NFCHandler, LEDHandler

sio = socketio.AsyncServer(cors_allowed_origins='*')
app = socketio.ASGIApp(sio)

# Service instances
nfc_service = NFCService()
led_service = LEDService()

# Handler instances
nfc_handler = NFCHandler(sio, nfc_service)
led_handler = LEDHandler(sio, led_service)

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    
@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

# Register handlers
nfc_handler.register_events()
led_handler.register_events()

if __name__ == '__main__':
    # Run with uvicorn
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8765)
```

### 2. NFC Service Architecture

```python
# services/nfc_service.py
import asyncio
import threading
from adafruit_pn532.spi import PN532_SPI

class NFCService:
    def __init__(self):
        self.pn532 = self._setup_pn532()
        self.scanning = False
        self.registration_mode = False
        self.registration_callback = None
        
    def start_scanning(self):
        """Background thread for continuous NFC scanning"""
        self.scanning = True
        thread = threading.Thread(target=self._scan_loop)
        thread.daemon = True
        thread.start()
        
    def _scan_loop(self):
        """Main scanning loop"""
        last_uid = None
        debounce_time = 3  # seconds
        
        while self.scanning:
            uid = self.pn532.read_passive_target(timeout=0.5)
            
            if uid and uid != last_uid:
                # New tag detected
                if self.registration_mode and self.registration_callback:
                    # In registration mode
                    asyncio.run(self.registration_callback(uid))
                else:
                    # Normal scanning mode
                    asyncio.run(self._handle_tag_scan(uid))
                
                last_uid = uid
                time.sleep(debounce_time)
            elif not uid:
                last_uid = None
                
            time.sleep(0.1)  # Small delay to prevent CPU spinning
```

### 3. Message Validation

```python
# models/messages.py
from pydantic import BaseModel
from typing import Optional, Literal, Dict, Any
from datetime import datetime

class BaseMessage(BaseModel):
    type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Dict[str, Any]

class RegisterTagStartMessage(BaseMessage):
    type: Literal["register_tag_start"]
    data: Dict[str, Any]  # Contains entry_id, timeout

class NFCTagScannedMessage(BaseMessage):
    type: Literal["nfc_tag_scanned"]
    data: Dict[str, Any]  # Contains registered, tag_uid, entry_id, etc.

# Message factory
def create_message(msg_type: str, data: Dict[str, Any]) -> BaseMessage:
    return BaseMessage(type=msg_type, data=data)
```

### 4. React WebSocket Hook

```javascript
// hooks/useWebSocket.js
import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

const WEBSOCKET_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8765';

export const useWebSocket = () => {
  const socket = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const messageHandlers = useRef(new Map());

  useEffect(() => {
    // Initialize socket connection
    socket.current = io(WEBSOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.current.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
    });

    socket.current.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    // Generic message handler
    socket.current.onAny((eventName, data) => {
      const message = { type: eventName, ...data };
      setLastMessage(message);
      
      // Call registered handlers
      const handler = messageHandlers.current.get(eventName);
      if (handler) {
        handler(message);
      }
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  const sendMessage = useCallback((type, data) => {
    if (socket.current && connected) {
      socket.current.emit(type, {
        timestamp: new Date().toISOString(),
        data
      });
    }
  }, [connected]);

  const registerHandler = useCallback((messageType, handler) => {
    messageHandlers.current.set(messageType, handler);
    
    return () => {
      messageHandlers.current.delete(messageType);
    };
  }, []);

  return {
    connected,
    sendMessage,
    lastMessage,
    registerHandler
  };
};
```

### 5. NFC Registration UI Flow

```javascript
// components/nfc/NFCRegistration.js
const NFCRegistration = ({ entryId, onComplete, onCancel }) => {
  const { sendMessage, registerHandler } = useWebSocket();
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Register message handlers
    const unsubscribe = [
      registerHandler('awaiting_tag', (msg) => {
        setStatus('waiting');
        setProgress(10);
      }),
      registerHandler('tag_write_progress', (msg) => {
        setStatus('writing');
        setProgress(msg.data.progress);
      }),
      registerHandler('tag_registered', (msg) => {
        setStatus('success');
        setProgress(100);
        setTimeout(() => onComplete(msg.data), 1500);
      }),
      registerHandler('error', (msg) => {
        setStatus('error');
        setError(msg.data.message);
      })
    ];

    // Start registration
    sendMessage('register_tag_start', { entry_id: entryId });

    return () => {
      unsubscribe.forEach(fn => fn());
      sendMessage('register_tag_cancel', {});
    };
  }, [entryId]);

  return (
    <Modal>
      {/* UI based on status */}
    </Modal>
  );
};
```

## Key Implementation Considerations

### 1. Thread Safety
- NFC scanning runs in separate thread
- Use asyncio queues for thread-to-async communication
- Proper locking for shared state

### 2. Error Recovery
- Automatic reconnection on both client and server
- Graceful handling of hardware disconnection
- Clear error states in UI

### 3. Performance
- Debounce NFC reads (3-second cooldown)
- Throttle LED updates (max 30fps)
- Efficient message serialization

### 4. Development Experience
- Mock mode for development without hardware
- Detailed logging with log levels
- WebSocket message inspector in React DevTools

### 5. State Management

```javascript
// context/NFCContext.js
const nfcReducer = (state, action) => {
  switch (action.type) {
    case 'START_SCANNING':
      return { ...state, isScanning: true };
    case 'TAG_SCANNED':
      return { 
        ...state, 
        lastScannedTag: action.payload,
        isScanning: false 
      };
    case 'START_REGISTRATION':
      return { 
        ...state, 
        isRegistering: true,
        registrationEntry: action.payload 
      };
    case 'REGISTRATION_COMPLETE':
      return { 
        ...state, 
        isRegistering: false,
        registrationEntry: null 
      };
    default:
      return state;
  }
};
```

## Testing Approach

### 1. Mock NFC Service
```python
class MockNFCService(NFCService):
    def __init__(self):
        self.mock_tags = [
            "04:11:5D:22:2C:65:80",
            "04:22:6E:33:3D:76:90"
        ]
        
    def simulate_tag_scan(self, index=0):
        """Simulate scanning a tag"""
        uid = self.mock_tags[index]
        asyncio.run(self._handle_tag_scan(uid))
```

### 2. WebSocket Testing
- Use `socket.io-client` for integration tests
- Record and replay message sequences
- Test reconnection scenarios

### 3. UI Testing
- Mock WebSocket hook for component tests
- Test all status states
- Verify timeout handling

## Deployment Configuration

### systemd Service
```ini
[Unit]
Description=NFC Collection WebSocket Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/nfc-collection
Environment="PATH=/home/pi/nfc-collection/venv/bin"
ExecStart=/home/pi/nfc-collection/venv/bin/python python-services/server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

### nginx Reverse Proxy
```nginx
location /socket.io/ {
    proxy_pass http://localhost:8765;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

## Future Optimizations

1. **Binary Protocol**: Use MessagePack for smaller messages
2. **Compression**: Enable WebSocket compression
3. **Clustering**: Multiple worker processes for scale
4. **Metrics**: Prometheus metrics for monitoring
5. **Rate Limiting**: Prevent abuse of NFC scanning