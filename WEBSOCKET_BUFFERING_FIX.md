# WebSocket Message Buffering Fix

## Problem
NFC tag scan events were being delayed until the server sent a PING message, suggesting that WebSocket messages were being buffered somewhere in the communication pipeline.

## Root Cause
1. The NFC scanning loop runs in a separate thread
2. It was calling `asyncio.run(callback(json_data))` from the thread
3. This creates a new event loop each time, causing timing issues
4. Socket.IO may buffer messages when called from different event loops
5. The client was configured to use both 'websocket' and 'polling' transports, potentially falling back to polling

## Solution

### 1. Thread-Safe Queue
- Added `self._scan_queue = queue.Queue()` to NFCService
- Scanning thread now puts events into the queue instead of calling asyncio.run
- Added `process_scan_queue()` method that runs in the main event loop

### 2. Main Event Loop Processing
- Server starts `asyncio.create_task(self.nfc_service.process_scan_queue())`
- This task runs in the main event loop and processes queued events
- Ensures all Socket.IO emits happen from the same event loop

### 3. WebSocket-Only Transport
- Changed client configuration to use only WebSocket transport
- Removed 'polling' fallback to prevent buffering delays
- Added `upgrade: false` to prevent transport switching

### 4. Explicit Async Mode
- Added `async_mode='aiohttp'` to Socket.IO server configuration
- Ensures consistent async behavior

## Benefits
1. **Immediate delivery**: Events are sent as soon as tags are scanned
2. **Thread safety**: No more cross-thread event loop issues
3. **Consistent timing**: All Socket.IO operations happen in main loop
4. **Lower latency**: WebSocket-only transport eliminates polling delays

## Testing
1. Place a tag on the reader
2. Should see immediate response in the UI
3. No delay waiting for PING messages
4. Consistent, predictable timing