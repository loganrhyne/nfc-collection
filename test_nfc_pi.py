#!/usr/bin/env python3
"""
Direct NFC scanning test for Raspberry Pi
Run this on the Pi to test if NFC hardware is working
"""

import sys
import os
import time
import logging

# Add python-services to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python-services'))

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_nfc_hardware():
    """Test NFC hardware directly"""
    print("=" * 60)
    print("NFC Hardware Test")
    print("=" * 60)

    try:
        from services.nfc_service import NFCService

        # Create service
        nfc = NFCService()
        status = nfc.get_status()

        print(f"\n📊 NFC Service Status:")
        print(f"   Hardware Available: {status['hardware_available']}")
        print(f"   Mock Mode: {status['mock_mode']}")
        print(f"   Scanning: {status['is_scanning']}")

        if not status['hardware_available'] and not status['mock_mode']:
            print("\n❌ NFC hardware not available!")
            print("   Check:")
            print("   - PN532 is connected properly")
            print("   - I2C is enabled (sudo raspi-config)")
            print("   - Python libraries installed (adafruit-circuitpython-pn532)")
            return False

        if status['mock_mode']:
            print("\n⚠️  Running in MOCK mode (no real hardware)")

        # Test scanning
        print("\n🔍 Starting scan test...")
        print("   Place an NFC tag on the reader within 10 seconds...")

        scan_events = []

        def scan_callback(data):
            print(f"\n✅ TAG DETECTED!")
            print(f"   Data: {data}")
            scan_events.append(data)

        # Start scanning
        nfc.start_continuous_scanning(scan_callback)

        # Wait for scan
        for i in range(10):
            print(f"   Waiting... {10-i} seconds remaining")
            time.sleep(1)
            if scan_events:
                break

        # Stop scanning
        nfc.stop_scanning()

        if scan_events:
            print(f"\n🎉 Success! Detected {len(scan_events)} tag(s)")
            for event in scan_events:
                print(f"   Entry ID: {event.get('id')}")
        else:
            print("\n⚠️  No tags detected in 10 seconds")

        return True

    except ImportError as e:
        print(f"\n❌ Import Error: {e}")
        print("   Make sure you're in the nfc-collection directory")
        print("   and dependencies are installed")
        return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_websocket_connection():
    """Test if we can connect to the WebSocket server"""
    print("\n" + "=" * 60)
    print("WebSocket Server Test")
    print("=" * 60)

    try:
        import socket

        # Test if port 8765 is open
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex(('localhost', 8765))
        sock.close()

        if result == 0:
            print("✅ Port 8765 is open (server appears to be running)")
            return True
        else:
            print("❌ Port 8765 is closed (server not running?)")
            print("   Start the server with:")
            print("   cd ~/nfc-collection/python-services")
            print("   python3 server.py")
            return False

    except Exception as e:
        print(f"❌ Error checking port: {e}")
        return False

if __name__ == "__main__":
    print("NFC Collection Diagnostic Tool")
    print("=" * 60)

    # Test WebSocket server
    ws_ok = test_websocket_connection()

    # Test NFC hardware
    nfc_ok = test_nfc_hardware()

    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"WebSocket Server: {'✅ OK' if ws_ok else '❌ Not Running'}")
    print(f"NFC Hardware: {'✅ OK' if nfc_ok else '❌ Issues Detected'}")

    if not ws_ok:
        print("\n⚠️  The WebSocket server needs to be running for the UI to work")
    if not nfc_ok:
        print("\n⚠️  Check the NFC hardware connection and configuration")