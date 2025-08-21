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
python server.py
```

## Note

These are manual integration tests used during development. For automated testing, see the unit tests in the respective component directories.