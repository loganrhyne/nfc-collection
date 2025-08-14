# NFC Registration MVP

This document describes the completed MVP for NFC tag registration in the sand collection journal application.

## Features Implemented

### 1. WebSocket Infrastructure
- **Python WebSocket Server** (`python-services/server.py`)
  - Handles bidirectional communication between Python services and React app
  - Uses Socket.IO for robust reconnection and event-based messaging
  - Supports mock mode for testing without physical NFC hardware

### 2. NFC Service
- **NFC Service Module** (`python-services/services/nfc_service.py`)
  - Interfaces with PN532 NFC reader via SPI
  - Supports reading and writing NTAG213 tags
  - Mock mode for development/testing
  - Compact JSON payload format for NFC data

### 3. React Integration
- **Register Sample Button** in `EntryView.js`
  - Added discrete button to journal entry view
  - Triggers NFC registration modal
  
- **NFC Registration Modal** (`NFCRegistrationModal.js`)
  - Guides user through registration process
  - Shows real-time status updates
  - Handles all states: waiting, writing, success, error
  
- **WebSocket Hook** (`useWebSocket.js`)
  - Custom React hook for WebSocket communication
  - Manages connection state and message handling
  - Event-based API for clean component integration

## Running the MVP

### 1. Start the Python WebSocket Server
```bash
cd python-services
python server.py
```

### 2. Start the React Development Server
```bash
cd dashboard-ui
npm start
```

### 3. Test the Registration Flow
1. Navigate to a journal entry in the React app
2. Click the "Register Sample" button
3. The modal will appear showing "Place Sample on Reader"
4. In mock mode, the tag will be automatically "detected" after 2 seconds
5. The system will write the entry data to the tag
6. Success message will be displayed

## NFC Data Format

Tags are written with compact JSON payloads:
```json
{
  "v": 1,                                    // Version
  "id": "1A88256FB33855EEB831ED2569B135CF", // Entry UUID
  "geo": [-33.890542, 151.274856],          // [lat, lng]
  "ts": 1705315800                           // Unix timestamp
}
```

## Testing

A test script is provided to simulate the registration flow:
```bash
cd python-services
python test_registration.py
```

## Next Steps

1. **Hardware Integration**
   - Test on Raspberry Pi with actual PN532 hardware
   - Ensure SPI configuration is correct
   - Validate NDEF writing to physical NTAG213 tags

2. **Error Handling**
   - Add retry logic for failed writes
   - Handle tag removal during writing
   - Validate tag capacity before writing

3. **User Experience**
   - Add audio/visual feedback for successful registration
   - Allow viewing registered tag data
   - Implement tag re-registration flow

4. **LED Integration**
   - Implement one-way WebSocket messages for LED control
   - Add LED feedback during tag operations

## Architecture Notes

The system uses a clean separation of concerns:
- Python handles all hardware interaction (NFC, future LED control)
- WebSocket provides real-time bidirectional communication
- React manages UI state and user interaction
- Socket.IO ensures reliable message delivery with automatic reconnection