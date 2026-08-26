#!/usr/bin/env python3
"""Live read/no-read feedback for diagnosing an intermittent PN532.

Prints one line per second so you get immediate feedback while physically
manipulating the reader -- flexing the board, reseating jumpers, pressing on
the antenna area, moving it away from metal. Watch for the moment the state
flips; that is the thing you were touching.

Run on the Pi with the service stopped, so nothing else owns the device:

    sudo systemctl stop nfc-server
    sudo ./python-services/venv/bin/python tests/manual/probe_reader.py
    sudo systemctl start nfc-server

Ctrl-C to stop; prints a summary.
"""
import sys
import time

import board
import busio
from digitalio import DigitalInOut
from adafruit_pn532.spi import PN532_SPI


def main():
    spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
    pn = PN532_SPI(spi, DigitalInOut(board.D25), debug=False)
    ic, ver, rev, sup = pn.firmware_version
    print(f"PN532 firmware {ver}.{rev} - SPI comms OK")
    pn.SAM_configuration()
    print("Polling. Present a tag and manipulate the board.\n")
    print("  each line = 1 second;  # = read,  . = no read\n")

    total = reads = 0
    flips = 0
    last_state = None
    started = time.time()
    try:
        while True:
            second_start = time.time()
            hits = polls = 0
            uid_seen = None
            while time.time() - second_start < 1.0:
                uid = pn.read_passive_target(timeout=0.2)
                polls += 1
                if uid:
                    hits += 1
                    uid_seen = ":".join(f"{b:02X}" for b in uid)
                time.sleep(0.05)
            total += polls
            reads += hits
            state = hits > 0
            if last_state is not None and state != last_state:
                flips += 1
                marker = "   <-- CHANGED"
            else:
                marker = ""
            last_state = state
            bar = "#" * hits + "." * (polls - hits)
            print(f"  [{time.time() - started:5.0f}s] {bar:<12} {hits}/{polls}  "
                  f"{uid_seen or '':<22}{marker}")
    except KeyboardInterrupt:
        pass
    finally:
        elapsed = time.time() - started
        pct = (100.0 * reads / total) if total else 0
        print(f"\n{reads}/{total} reads ({pct:.0f}%) over {elapsed:.0f}s, "
              f"{flips} transitions between reading and not reading")
        if flips > 2:
            print("Frequent transitions point at an intermittent connection "
                  "rather than range or tag quality.")


if __name__ == "__main__":
    sys.exit(main())
