#!/usr/bin/env python3
"""
Hardware continuity test for the LED strip.

Run on the Pi, talks directly to NeoPixel (does not go through the
WebSocket server / LEDController). Use this to validate soldering,
row-to-row splices, and individual LED function before exercising
the full app.

Usage:
    python test_led_strip.py                  # run all patterns
    python test_led_strip.py --pattern rows   # just one pattern
    python test_led_strip.py --num 100        # smaller strip
    python test_led_strip.py --brightness 0.2

Patterns:
    walk      - light each LED in sequence (pinpoints single failures)
    rows      - light each row solid in a unique color (splice validation)
    endpoints - light first + last LED of each row (fastest splice check)
    all       - fill white at given brightness (gross failure check)

Ctrl+C to abort; LEDs are cleared on exit.
"""

import argparse
import sys
import time

import board
import neopixel


ROW_COLORS = [
    (255, 0, 0),     (255, 128, 0),   (255, 255, 0),   (128, 255, 0),
    (0, 255, 0),     (0, 255, 128),   (0, 255, 255),   (0, 128, 255),
    (0, 0, 255),     (128, 0, 255),   (255, 0, 255),   (255, 0, 128),
    (255, 255, 255), (255, 128, 128), (128, 255, 128),
]


def walk(pixels, num, cols, delay=0.05):
    print(f"[walk] lighting each LED 0..{num - 1}")
    for i in range(num):
        pixels.fill((0, 0, 0))
        pixels[i] = (0, 255, 0)
        pixels.show()
        if i % cols == 0:
            print(f"  row {i // cols} starts at index {i}")
        time.sleep(delay)


def rows(pixels, num, cols, hold=2.0):
    rows_count = (num + cols - 1) // cols
    print(f"[rows] lighting {rows_count} rows in sequence")
    for r in range(rows_count):
        pixels.fill((0, 0, 0))
        color = ROW_COLORS[r % len(ROW_COLORS)]
        start = r * cols
        end = min(start + cols, num)
        for i in range(start, end):
            pixels[i] = color
        pixels.show()
        print(f"  row {r}: indices {start}..{end - 1}, color {color}")
        time.sleep(hold)


def endpoints(pixels, num, cols, hold=4.0):
    rows_count = (num + cols - 1) // cols
    print(f"[endpoints] first+last LED of each row, simultaneously")
    pixels.fill((0, 0, 0))
    for r in range(rows_count):
        start = r * cols
        end = min(start + cols, num) - 1
        pixels[start] = (255, 0, 0)   # red = row start
        pixels[end] = (0, 0, 255)     # blue = row end
    pixels.show()
    print(f"  red = first LED of each row, blue = last LED of each row")
    print(f"  any missing pair indicates a broken splice into that row")
    time.sleep(hold)


def fill_all(pixels, num, cols, hold=3.0):
    print(f"[all] filling all {num} pixels white")
    pixels.fill((255, 255, 255))
    pixels.show()
    time.sleep(hold)


PATTERNS = {
    "walk": walk,
    "rows": rows,
    "endpoints": endpoints,
    "all": fill_all,
}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--num", type=int, default=300)
    p.add_argument("--cols", type=int, default=20)
    p.add_argument("--brightness", type=float, default=0.1)
    p.add_argument("--pattern", choices=list(PATTERNS) + ["all-patterns"], default="all-patterns")
    p.add_argument("--gpio", default="D18")
    p.add_argument("--order", default="GRB")
    args = p.parse_args()

    pin = getattr(board, args.gpio)
    pixels = neopixel.NeoPixel(
        pin, args.num,
        auto_write=False,
        pixel_order=args.order,
        brightness=args.brightness,
    )

    sequence = list(PATTERNS) if args.pattern == "all-patterns" else [args.pattern]
    try:
        for name in sequence:
            PATTERNS[name](pixels, args.num, args.cols)
    except KeyboardInterrupt:
        print("\naborted")
    finally:
        pixels.fill((0, 0, 0))
        pixels.show()
        print("cleared")


if __name__ == "__main__":
    sys.exit(main())
