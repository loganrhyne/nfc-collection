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
