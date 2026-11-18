#!/usr/bin/env python3
"""Merge a partial Day One export into the deployed journal.

Day One can export a single entry (or any subset) as a zip. Syncing that as-is
would replace the whole journal, so instead the export's entries are upserted
by uuid into the deployed journal:

  * an export entry whose uuid is already deployed replaces it in place
    (Day One is the source of truth, so its copy wins)
  * an export entry with a new uuid is appended
  * deployed entries absent from the export are kept untouched

The deployed journal's top-level metadata is preserved.

Exit codes:
    0  merged journal written
    1  refused -- nothing written
    2  nothing to change -- every exported entry is already deployed as-is

Usage:
    merge-journal.py <deployed.json> <export.json> -o <merged.json>
"""
import argparse
import json
import os
import sys

# Fields compared when reporting what an update changes. Anything else that
# differs is reported as "other fields".
REPORTED_FIELDS = ("text", "tags", "location", "photos", "videos", "creationDate")


def load_entries(path, role):
    try:
        with open(path) as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError) as e:
        raise ValueError(f"cannot read {role} journal {path}: {e}")
    entries = data.get("entries") if isinstance(data, dict) else None
    if not isinstance(entries, list):
        raise ValueError(f"{role} journal has no 'entries' array: {path}")
    for entry in entries:
        if not isinstance(entry, dict) or not entry.get("uuid"):
            raise ValueError(f"{role} journal has an entry without a uuid")
    return data, entries


def title_of(entry):
    first = (entry.get("text") or "").strip().split("\n")[0]
    return first.lstrip("# ").replace("\\", "")[:60] or "(untitled)"


def changed_fields(old, new):
    changed = [f for f in REPORTED_FIELDS if old.get(f) != new.get(f)]
    others = {k for k in set(old) | set(new)
              if k not in REPORTED_FIELDS and old.get(k) != new.get(k)}
    if others:
        changed.append("other fields")
    return changed


def merge(deployed_data, deployed_entries, export_entries):
    """Return (merged_data, added, updated, unchanged)."""
    seen = set()
    for entry in export_entries:
        if entry["uuid"] in seen:
            raise ValueError(f"export contains uuid {entry['uuid']} twice")
        seen.add(entry["uuid"])

    position = {e["uuid"]: i for i, e in enumerate(deployed_entries)}
    merged = list(deployed_entries)
    added, updated, unchanged = [], [], []

    for entry in export_entries:
        i = position.get(entry["uuid"])
        if i is None:
            merged.append(entry)
            added.append(entry)
        elif merged[i] == entry:
            unchanged.append(entry)
        else:
            updated.append((entry, changed_fields(merged[i], entry)))
            merged[i] = entry

    merged_data = dict(deployed_data)
    merged_data["entries"] = merged
    return merged_data, added, updated, unchanged


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("deployed")
    ap.add_argument("export")
    ap.add_argument("-o", "--output", required=True)
    args = ap.parse_args()

    try:
        deployed_data, deployed_entries = load_entries(args.deployed, "deployed")
        _, export_entries = load_entries(args.export, "export")
        merged_data, added, updated, unchanged = merge(
            deployed_data, deployed_entries, export_entries)
    except ValueError as e:
        print(f"REFUSED: {e}")
        return 1

    print(f"Deployed entries: {len(deployed_entries)}")
    print(f"Export entries:   {len(export_entries)}")
    for entry in added:
        print(f"  + new      {entry.get('creationDate', '?')[:10]}  {title_of(entry)}")
    for entry, fields in updated:
        print(f"  ~ updated  {entry.get('creationDate', '?')[:10]}  {title_of(entry)}"
              f"  ({', '.join(fields)})")
    for entry in unchanged:
        print(f"  = same     {entry.get('creationDate', '?')[:10]}  {title_of(entry)}")
    print(f"Merged entries:   {len(merged_data['entries'])}")

    if not added and not updated:
        print("\nNothing to change: every exported entry is already deployed as-is.")
        return 2

    tmp = args.output + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(merged_data, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, args.output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
