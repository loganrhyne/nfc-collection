# NFC Tag Scanning Feature

This document describes the NFC tag scanning feature that automatically opens journal entries when an NFC tag is scanned.

## How It Works

1. **Continuous Scanning**: The Python WebSocket server continuously scans for NFC tags in the background
2. **Tag Detection**: When a tag is detected, it reads the JSON data from the tag
3. **WebSocket Event**: The server emits a `tag_scanned` event to all connected clients
4. **Auto-Navigation**: The React app automatically navigates to the journal entry associated with the scanned tag

## Architecture

### Python Server Side
- `NFCService.start_continuous_scanning()`: Runs in background, scanning every 0.5 seconds
- Low-power mode with 100ms timeout per scan attempt
- 3-second debounce to prevent repeated reads of the same tag
- Reads JSON data from NDEF records on the tag

### React Client Side
- `NFCScanner` component: Global event listener for `tag_scanned` events
- Automatically navigates to `/entry/{entry_id}` when a tag is scanned
- Works from any page in the application

## Testing

### Mock Mode (Development)
In mock mode, the server simulates a tag scan every 5 seconds with test data:
```json
{
  "v": 1,
  "id": "1A88256FB33855EEB831ED2569B135CF",
  "geo": [-33.890542, 151.274856],
  "ts": 1652397920
}
```

### Test the Feature
1. Start the Python server:
```bash
cd python-services
python server.py
```

2. Run the test script to monitor scanning:
```bash
python test_scanning.py
```

3. Open the React app and watch it automatically navigate to entries

### On Raspberry Pi
With real NFC hardware:
- Place any registered NFC tag near the reader
- The app will automatically navigate to that entry
- Tags are debounced - same tag won't trigger for 3 seconds

## Power Consumption
- 100ms scan timeout keeps power usage low
- 500ms delay between scans
- Minimal CPU usage when no tags present

## Integration with Physical Installation
Perfect for gallery/exhibition settings:
- Visitors can tap physical sand samples
- App automatically displays the associated journal entry
- No buttons or manual navigation required
- Seamless physical-to-digital experience