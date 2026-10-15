"""The viewer must show saved placements even after chronology changes."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('tag_registry', Path(__file__).resolve().parents[1] / 'python-services/services/tag_registry.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SampleLocationsTest(unittest.TestCase):
    def test_saved_cells_and_missing_placement(self):
        registry = module.TagRegistry.__new__(module.TagRegistry)
        registry._load_error = None
        registry._entries = {'first': {'grid_index': 0}, 'later': {'grid_index': 72}, 'unknown': {'grid_index': None}}
        registry._chronological = ['later', 'first']
        self.assertEqual(registry.sample_locations(20), {'samples': {
            'first': {'row': 0, 'col': 0}, 'later': {'row': 3, 'col': 12}, 'unknown': None}})

    def test_unreadable_registry_is_not_empty_registry(self):
        registry = module.TagRegistry.__new__(module.TagRegistry)
        registry._load_error = 'bad data'
        self.assertIn('error', registry.sample_locations())

class ScanRecoveryTest(unittest.TestCase):
    def setUp(self):
        import tempfile, json
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        journal = Path(self.tmp.name) / 'journal.json'
        journal.write_text(json.dumps({'entries': [
            {'uuid': 'one', 'creationDate': '2020-01-01'},
            {'uuid': 'two', 'creationDate': '2020-01-02'}]}))
        self.registry = module.TagRegistry(str(Path(self.tmp.name) / 'registry.json'), str(journal))

    def test_valid_scan_recovers_and_persists_missing_record(self):
        self.assertTrue(self.registry.recover_scanned_registration('one', 'AA'))
        self.assertEqual(self.registry.by_tag_uid('AA'), 'one')
        self.registry.load()
        self.assertEqual(self.registry.sample_locations()['samples']['one'], {'row': 0, 'col': 0})

    def test_existing_placement_and_binding_are_preserved(self):
        self.registry.register('one', 'AA', grid_index=72)
        self.assertFalse(self.registry.recover_scanned_registration('one', 'BB'))
        self.assertFalse(self.registry.recover_scanned_registration('two', 'AA'))
        self.assertEqual(self.registry.sample_locations()['samples']['one'], {'row': 3, 'col': 12})

    def test_unknown_id_and_occupied_cell_are_not_recovered(self):
        self.assertFalse(self.registry.recover_scanned_registration('unknown', 'AA'))
        self.registry.register('two', 'BB', grid_index=0)
        self.assertFalse(self.registry.recover_scanned_registration('one', 'AA'))
