#!/usr/bin/env python3
"""Persistent record of which sample is in which box, and where that box lives.

Before this existed, the entry<->tag binding lived only as JSON written onto the
physical sticker, and a box's grid cell was re-derived client-side from a
chronological sort. That meant a damaged tag orphaned a sample with no way to
audit it, and backfilling one Day One entry silently shifted every later box's
LED off its physical position.

Grid index is the entry's chronological position among all journal entries. It
wraps like lines of text (row = idx // cols, col = idx % cols); the serpentine
LED wiring is absorbed separately by LEDController._get_pixel_index, so callers
here deal only in chronological cells.

The index is *assigned* from the chronological sort at registration time and
then *stored*. Later entries backfilled with older dates therefore cannot move a
box that has already been physically placed -- they show up as drift instead.
"""
import json
import logging
import os
import tempfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_REGISTRY_PATH = os.path.join(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))), 'data', 'tag_registry.json')
DEFAULT_JOURNAL_PATH = os.path.expanduser('~/nfc-media/journal.json')

SCHEMA_VERSION = 1


class TagRegistry:
    def __init__(self, registry_path: Optional[str] = None,
                 journal_path: Optional[str] = None):
        self.registry_path = registry_path or os.getenv(
            'TAG_REGISTRY_PATH', DEFAULT_REGISTRY_PATH)
        self.journal_path = journal_path or os.getenv(
            'JOURNAL_PATH', DEFAULT_JOURNAL_PATH)
        self._entries: Dict[str, Dict[str, Any]] = {}   # uuid -> registration
        self._chronological: List[str] = []             # uuid, oldest first
        self._titles: Dict[str, str] = {}
        self._coords: Dict[str, list] = {}
        self.load()
        self.reload_journal()

    # --- persistence ----------------------------------------------------

    def load(self) -> None:
        if not os.path.isfile(self.registry_path):
            logger.info(f"No registry at {self.registry_path} - starting empty")
            return
        try:
            with open(self.registry_path) as fh:
                data = json.load(fh)
            self._entries = data.get('registrations', {})
            logger.info(f"Loaded {len(self._entries)} registrations from "
                        f"{self.registry_path}")
        except Exception as e:
            # Never destroy a registry we failed to parse.
            logger.error(f"Could not read registry {self.registry_path}: {e}")
            self._entries = {}

    def save(self) -> None:
        """Write atomically -- a partial registry is worse than a stale one."""
        payload = {
            'schema_version': SCHEMA_VERSION,
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'registrations': self._entries,
        }
        os.makedirs(os.path.dirname(self.registry_path), exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=os.path.dirname(self.registry_path),
                                   suffix='.tmp')
        try:
            with os.fdopen(fd, 'w') as fh:
                json.dump(payload, fh, indent=2)
            os.replace(tmp, self.registry_path)
        except Exception:
            if os.path.exists(tmp):
                os.unlink(tmp)
            raise

    # --- journal / chronological order -----------------------------------

    def reload_journal(self) -> int:
        """Recompute chronological order from the journal. Returns entry count."""
        if not os.path.isfile(self.journal_path):
            logger.warning(f"No journal at {self.journal_path} - grid indices "
                           f"cannot be assigned")
            self._chronological = []
            return 0
        try:
            with open(self.journal_path) as fh:
                data = json.load(fh)
            entries = data.get('entries', data if isinstance(data, list) else [])
        except Exception as e:
            logger.error(f"Could not read journal {self.journal_path}: {e}")
            return 0

        dated = [e for e in entries if e.get('uuid') and e.get('creationDate')]
        dated.sort(key=lambda e: e['creationDate'])
        self._chronological = [e['uuid'] for e in dated]
        self._titles = {e['uuid']: _title_of(e) for e in dated}
        self._coords = {}
        for e in dated:
            loc = e.get('location') or {}
            lat, lon = loc.get('latitude'), loc.get('longitude')
            if lat is not None and lon is not None:
                self._coords[e['uuid']] = [lat, lon]
        logger.info(f"Journal: {len(self._chronological)} dated entries")
        return len(self._chronological)

    def coords_of(self, entry_uuid: str) -> Optional[list]:
        """[lat, lon] from the journal, or None if the entry has no location.

        The tag payload is written from this rather than from anything the
        client sends: coordinates end up baked onto a physical sticker, so
        they should come from the same source of truth the display uses.
        """
        return self._coords.get(entry_uuid)

    def chronological_index(self, entry_uuid: str) -> Optional[int]:
        try:
            return self._chronological.index(entry_uuid)
        except ValueError:
            return None

    # --- registration -----------------------------------------------------

    def register(self, entry_uuid: str, tag_uid: str,
                 grid_index: Optional[int] = None) -> Dict[str, Any]:
        """Record a registration, overwriting any previous one for this entry."""
        if grid_index is None:
            grid_index = self.chronological_index(entry_uuid)

        previous = self._entries.get(entry_uuid)
        record = {
            'tag_uid': tag_uid,
            'grid_index': grid_index,
            'registered_at': datetime.now(timezone.utc).isoformat(),
            'title': self._titles.get(entry_uuid, ''),
        }
        if previous:
            logger.info(f"Overwriting registration for {entry_uuid}: "
                        f"tag {previous.get('tag_uid')} -> {tag_uid}")
            record['previous_tag_uid'] = previous.get('tag_uid')
        self._entries[entry_uuid] = record
        self.save()
        return record

    def by_tag_uid(self, tag_uid: str) -> Optional[str]:
        """Which entry is bound to this tag, if any."""
        for uuid, rec in self._entries.items():
            if rec.get('tag_uid') == tag_uid:
                return uuid
        return None

    # --- reporting --------------------------------------------------------

    def drift(self) -> List[Dict[str, Any]]:
        """Registered boxes whose stored cell no longer matches chronology.

        Happens when a Day One entry is backfilled with an older date: every
        later sample's chronological position shifts, but the physical boxes
        did not move. Surfacing this makes re-seating a deliberate act rather
        than a silent mismatch.
        """
        out = []
        for uuid, rec in self._entries.items():
            current = self.chronological_index(uuid)
            if current is not None and rec.get('grid_index') != current:
                out.append({
                    'entry_uuid': uuid,
                    'title': rec.get('title', ''),
                    'placed_at_index': rec.get('grid_index'),
                    'chronological_index': current,
                })
        return sorted(out, key=lambda d: d['placed_at_index'] if d['placed_at_index'] is not None else -1)

    def status(self) -> Dict[str, Any]:
        drift = self.drift()
        return {
            'registered': len(self._entries),
            'journal_entries': len(self._chronological),
            'unregistered': max(0, len(self._chronological) - len(self._entries)),
            'drift_count': len(drift),
        }


def _title_of(entry: Dict[str, Any]) -> str:
    text = (entry.get('text') or '').strip()
    first = text.split('\n')[0] if text else ''
    return first.lstrip('#').strip().replace('\\', '')[:80]


_registry: Optional[TagRegistry] = None


def get_tag_registry() -> TagRegistry:
    global _registry
    if _registry is None:
        _registry = TagRegistry()
    return _registry
