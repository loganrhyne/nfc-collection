#!/usr/bin/env python3
"""Validate a Day One export before it replaces the live journal.

The dashboard consumes this file directly and the NFC registration flow writes
its coordinates onto physical tags, so a bad export is expensive: a truncated
one blanks the display, and a missing location bakes [0, 0] into a sticker that
then has to be re-written by hand.

Exit codes:
    0  safe to sync
    1  refused -- do not sync

Usage:
    validate-journal.py <journal.json> [--baseline-count N] [--media-dir DIR] [--strict]
"""
import argparse
import json
import os
import re
import sys
from collections import Counter

# Fields the dashboard cannot render an entry without.
REQUIRED = ("uuid", "creationDate")


def tag_values(entry, prefix):
    return [t.split(":", 1)[1].strip()
            for t in (entry.get("tags") or []) if t.startswith(prefix)]


def title_of(entry):
    text = (entry.get("text") or "").strip()
    first = text.split("\n")[0] if text else ""
    return re.sub(r"^#+\s*", "", first).replace("\\", "")[:60] or "(untitled)"


def label(entry):
    return f"{(entry.get('creationDate') or '?')[:10]}  {title_of(entry)}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("journal")
    ap.add_argument("--baseline-count", type=int, default=None,
                    help="entry count currently deployed; refuses a shrinking export")
    ap.add_argument("--media-dir", default=None,
                    help="export root, to check referenced photos/videos exist")
    ap.add_argument("--strict", action="store_true",
                    help="treat warnings (missing coords/tags) as failures")
    args = ap.parse_args()

    errors, warnings = [], []

    # --- parse -------------------------------------------------------------
    if not os.path.isfile(args.journal):
        print(f"REFUSED: no such file: {args.journal}")
        return 1
    if os.path.getsize(args.journal) == 0:
        print("REFUSED: journal file is empty")
        return 1
    try:
        with open(args.journal) as fh:
            data = json.load(fh)
    except json.JSONDecodeError as e:
        print(f"REFUSED: journal is not valid JSON: {e}")
        return 1

    entries = data.get("entries") if isinstance(data, dict) else data
    if not isinstance(entries, list):
        print("REFUSED: no 'entries' array found")
        return 1
    if not entries:
        print("REFUSED: export contains zero entries")
        return 1

    print(f"Entries in export: {len(entries)}")

    # --- shrink guard ------------------------------------------------------
    # The most damaging realistic failure is a partial export silently
    # replacing a complete journal, so this one is always fatal.
    if args.baseline_count is not None:
        print(f"Entries currently deployed: {args.baseline_count}")
        if len(entries) < args.baseline_count:
            errors.append(
                f"export has FEWER entries than deployed "
                f"({len(entries)} < {args.baseline_count}) - looks partial")
        else:
            print(f"  +{len(entries) - args.baseline_count} new")

    # --- per-entry ---------------------------------------------------------
    seen_uuids = {}
    missing = Counter()
    no_coords, no_type, no_region, missing_media = [], [], [], []

    for entry in entries:
        for field in REQUIRED:
            if not entry.get(field):
                missing[field] += 1

        uid = entry.get("uuid")
        if uid:
            if uid in seen_uuids:
                errors.append(f"duplicate uuid {uid}: {label(entry)}")
            seen_uuids[uid] = entry

        loc = entry.get("location") or {}
        if loc.get("latitude") is None or loc.get("longitude") is None:
            no_coords.append(entry)
        if not tag_values(entry, "Type:"):
            no_type.append(entry)
        if not tag_values(entry, "Region:"):
            no_region.append(entry)

        if args.media_dir:
            for kind in ("photos", "videos"):
                for m in (entry.get(kind) or []):
                    ident = m.get("md5") or m.get("identifier")
                    if not ident:
                        continue
                    hits = [f for f in os.listdir(os.path.join(args.media_dir, kind))
                            if f.startswith(ident)] \
                        if os.path.isdir(os.path.join(args.media_dir, kind)) else []
                    if not hits:
                        missing_media.append((label(entry), kind, ident))

    for field, count in missing.items():
        errors.append(f"{count} entries missing required field '{field}'")

    if no_coords:
        warnings.append(
            f"{len(no_coords)} entries have no coordinates - registration would "
            f"write geo [0, 0] onto those tags")
    if no_type:
        warnings.append(f"{len(no_type)} entries have no 'Type:' tag - LED renders white")
    if no_region:
        warnings.append(f"{len(no_region)} entries have no 'Region:' tag")
    if missing_media:
        warnings.append(f"{len(missing_media)} referenced media files not found in the export")

    # --- report ------------------------------------------------------------
    def show(entries_list, heading, limit=10):
        if not entries_list:
            return
        print(f"\n  {heading}")
        for e in entries_list[:limit]:
            print(f"    - {label(e)}")
        if len(entries_list) > limit:
            print(f"    ... and {len(entries_list) - limit} more")

    show(no_coords, "no coordinates (geo [0,0] would be written to the tag):")
    show(no_type, "no Type: tag:")
    show(no_region, "no Region: tag:")
    if missing_media:
        print("\n  missing media files:")
        for lbl, kind, ident in missing_media[:10]:
            print(f"    - {lbl}  [{kind}/{ident}]")

    print()
    for w in warnings:
        print(f"WARNING: {w}")
    for e in errors:
        print(f"ERROR:   {e}")

    if errors:
        print("\nREFUSED: export failed validation - not syncing")
        return 1
    if warnings and args.strict:
        print("\nREFUSED: warnings present and --strict was requested")
        return 1
    if warnings:
        print("\nPASSED with warnings - safe to sync, but the entries above will "
              "degrade in the display or on their tags")
    else:
        print("\nPASSED - export is clean")
    return 0


if __name__ == "__main__":
    sys.exit(main())
