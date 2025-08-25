# Fix for Selected Entry Brightness

## Problem
Selected entry is not showing brighter than background entries (both appear at 5% brightness).

## Quick Test
Run this test script to diagnose:
```bash
cd /home/loganrhyne/nfc-collection/python-services
source venv/bin/activate
python ../tests/manual/test_selection_brightness.py
```

## Temporary Fix
If the selected entry still isn't bright, you can manually copy the fixed LED controller:

```bash
cd /home/loganrhyne/nfc-collection
cp /path/to/fixed/led_controller.py python-services/services/
sudo systemctl restart nfc-websocket
```

## What Was Fixed
1. Ensured selected entries always get set to 80% brightness
2. Fixed the fade logic to properly handle first selection
3. Added logging to track selected index changes
4. Updated state tracking in fade function

## Brightness Levels
- Background (filtered): 5% (0.05)
- Selected: 80% (0.8)

## Debugging
Check WebSocket logs for LED updates:
```bash
sudo journalctl -u nfc-websocket -f | grep "LED Update"
```

You should see logs like:
```
LED Update: 150 entries, selected index: 42, previous selected: None
```