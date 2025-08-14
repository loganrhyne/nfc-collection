# WebSocket API Documentation

## Connection

### Endpoint
```
ws://[host]:8765/socket.io/
```

### Connection Options
```javascript
{
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  reconnectionAttempts: Infinity,
  timeout: 20000,
  transports: ['websocket', 'polling'],
  auth: {
    token: 'optional-auth-token'
  }
}
```

## Events

### Client → Server

#### `register_tag_start`
Begin NFC tag registration process.

**Request:**
```json
{
  "entry_id": "uuid-string",
  "entry_data": {
    "coordinates": [latitude, longitude],
    "timestamp": "ISO-8601-timestamp"
  }
}
```

**Responses:**
- `awaiting_tag` - Ready for tag
- `tag_write_progress` - Writing in progress
- `tag_registered` - Success
- `error` - Failure

#### `register_tag_cancel`
Cancel ongoing registration.

**Request:**
```json
{}
```

#### `ping`
Heartbeat to measure latency.

**Request:**
```json
{
  "timestamp": 1234567890000
}
```

**Response:**
- `pong` event with timestamp

### Server → Client

#### `connection_status`
Sent immediately after connection.

**Payload:**
```json
{
  "connected": true,
  "nfc_available": true,
  "server_version": "2.0.0",
  "features": {
    "rate_limiting": true,
    "authentication": false,
    "heartbeat": true,
    "message_queue": true
  }
}
```

#### `awaiting_tag`
Registration ready, waiting for tag.

**Payload:**
```json
{
  "message": "Place NFC tag on reader",
  "timeout": 30,
  "entry_id": "uuid-string"
}
```

#### `tag_write_progress`
Progress update during write.

**Payload:**
```json
{
  "progress": 50,
  "message": "Writing data to tag...",
  "tag_info": {
    "uid": "01:23:45:67:89:AB:CD",
    "type": "ntag213",
    "capacity": 144
  }
}
```

#### `tag_registered`
Tag successfully registered.

**Payload:**
```json
{
  "success": true,
  "tag_uid": "01:23:45:67:89:AB:CD",
  "entry_id": "uuid-string",
  "ndef_data": {
    "v": 1,
    "id": "uuid-string",
    "geo": [lat, lon],
    "ts": 1234567890
  },
  "bytes_written": 89,
  "tag_type": "ntag213"
}
```

#### `tag_scanned`
Tag detected during continuous scanning.

**Payload:**
```json
{
  "entry_id": "uuid-string",
  "tag_data": {
    "v": 1,
    "id": "uuid-string",
    "geo": [lat, lon],
    "ts": 1234567890
  },
  "timestamp": "ISO-8601-timestamp"
}
```

#### `error`
Error occurred during operation.

**Payload:**
```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "field": "optional-field-name",
  "retry_count": 0
}
```

**Error Codes:**
- `INVALID_REQUEST` - Malformed request
- `AUTH_FAILED` - Authentication failure
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `TIMEOUT` - Operation timed out
- `NFC_ERROR` - Hardware error
- `WRITE_FAILED` - Tag write failed
- `DATA_VALIDATION_ERROR` - Invalid data
- `REGISTRATION_IN_PROGRESS` - Already registering
- `INTERNAL_ERROR` - Server error

#### `pong`
Response to ping.

**Payload:**
```json
{
  "timestamp": 1234567890000,
  "server_time": 1234567890000
}
```

## Authentication

If authentication is enabled (`WS_AUTH_ENABLED=true`), include token in connection:

```javascript
const socket = io(url, {
  auth: {
    token: 'your-auth-token'
  }
});
```

## Rate Limiting

Default limits:
- 100 requests per 60 seconds per client
- Configurable via environment variables

## Message Queue

When disconnected, the client queues messages locally:
- Maximum 100 messages queued
- Messages older than 5 minutes are discarded
- Queue processed on reconnection

## Example Usage

### JavaScript Client

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:8765', {
  reconnectionAttempts: Infinity
});

// Listen for connection
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

// Register a tag
socket.emit('register_tag_start', {
  entry_id: '123e4567-e89b-12d3-a456-426614174000',
  entry_data: {
    coordinates: [-33.890542, 151.274856],
    timestamp: new Date().toISOString()
  }
});

// Listen for responses
socket.on('tag_registered', (data) => {
  console.log('Tag registered:', data);
});

socket.on('error', (error) => {
  console.error('Error:', error);
});
```

### Python Client

```python
import socketio

sio = socketio.Client()

@sio.event
def connect():
    print('Connected')

@sio.event
def tag_scanned(data):
    print(f"Tag scanned: {data}")

sio.connect('http://localhost:8765')
sio.wait()
```