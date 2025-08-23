# Filtered LED Test Guide

## Running the Test

### Option 1: Using the run script
```bash
cd /home/loganrhyne/nfc-collection/tests/manual
./run_filtered_test.sh
```

### Option 2: Manual execution
```bash
cd /home/loganrhyne/nfc-collection/python-services
source venv/bin/activate
python ../tests/manual/test_filtered_leds.py
```

### Option 3: Direct from python-services
```bash
cd /home/loganrhyne/nfc-collection/python-services
source venv/bin/activate
python -m tests.manual.test_filtered_leds
```

## What the Test Does

The test simulates 5 different filter scenarios:

1. **All Beach entries** - Shows multiple amber LEDs with one selected
2. **Mixed types** - Shows all 6 colors with Mountain selected
3. **Dense cluster** - Tests nearby LEDs with center selected
4. **No selection** - All filtered entries at 30% brightness
5. **Empty filter** - Clears all LEDs

Each scenario runs for 3 seconds.

## Expected Results

- **Selected entry**: Full brightness (very bright)
- **Filtered entries**: 30% brightness (dimmer but visible)
- **Colors**: Match the Harmonious palette
  - Beach: Golden amber
  - Desert: Hot coral red
  - Lake: Electric cyan
  - Mountain: Vivid green
  - River: Deep blue
  - Ruin: Bright magenta

## Troubleshooting

If you get import errors:
1. Make sure you're in the virtual environment
2. Check that the WebSocket server is running
3. Verify the LED controller is in hardware mode

## Real-Time Testing

To test with the actual app:
1. Open the dashboard: http://192.168.1.114/
2. Apply filters (click on chart bars)
3. Watch the LED grid update
4. Select different entries to see brightness change