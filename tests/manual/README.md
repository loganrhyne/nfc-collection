# Manual Test Scripts

This directory contains manual test scripts for testing specific components of the NFC Collection system.

## Available Tests

### LED Controller Tests

- **test_led_websocket.py** - Tests LED WebSocket commands programmatically
  ```bash
  python test_led_websocket.py
  ```

- **test_led_ui.html** - Interactive LED grid visualization for testing
  ```bash
  python -m http.server 8000
  # Open http://localhost:8000/test_led_ui.html
  ```

- **test_led_colors.py** - Hardware test to verify correct byte order
  ```bash
  python test_led_colors.py
  ```

- **set_led_byteorder.py** - Utility to change LED byte order configuration
  ```bash
  python set_led_byteorder.py GRB  # Options: RGB, RBG, GRB, GBR, BRG, BGR
  ```

- **led_animation_demo.py** - Rainbow animation demo for hardware testing
  ```bash
  python led_animation_demo.py
  ```

### NFC Tests

- **test_registration.py** - Tests NFC tag registration flow
  ```bash
  python test_registration.py
  ```

- **test_scanning.py** - Tests NFC continuous scanning
  ```bash
  python test_scanning.py
  ```

## Prerequisites

These tests require the WebSocket server to be running:
```bash
cd ../../python-services
source venv/bin/activate  # If using virtual environment
python server.py
```

For hardware LED tests on the Raspberry Pi:
```bash
cd /home/loganrhyne/nfc-collection/python-services
source venv/bin/activate
# Then run the test scripts
```

## Note

These are manual integration tests used during development. For automated testing, see the unit tests in the respective component directories.