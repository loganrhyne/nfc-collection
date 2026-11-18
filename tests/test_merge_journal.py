import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "merge-journal.py"
spec = importlib.util.spec_from_file_location("merge_journal", SCRIPT)
merge_journal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(merge_journal)


def entry(uuid, text="# Title", **extra):
    return {"uuid": uuid, "creationDate": "2026-10-22T13:28:06Z", "text": text, **extra}


class MergeTests(unittest.TestCase):
    def setUp(self):
        self.deployed = {"metadata": {"version": "1.0"},
                         "entries": [entry("A"), entry("B"), entry("C")]}

    def run_merge(self, export_entries):
        return merge_journal.merge(self.deployed, self.deployed["entries"], export_entries)

    def test_new_entry_is_appended_and_others_kept(self):
        merged, added, updated, unchanged = self.run_merge([entry("D")])
        self.assertEqual([e["uuid"] for e in merged["entries"]], ["A", "B", "C", "D"])
        self.assertEqual([e["uuid"] for e in added], ["D"])
        self.assertEqual((updated, unchanged), ([], []))
        self.assertEqual(merged["metadata"], {"version": "1.0"})

    def test_existing_entry_is_replaced_in_place(self):
        new_b = entry("B", tags=["Type: Lake"])
        merged, added, updated, _ = self.run_merge([new_b])
        self.assertEqual([e["uuid"] for e in merged["entries"]], ["A", "B", "C"])
        self.assertEqual(merged["entries"][1], new_b)
        self.assertEqual(added, [])
        self.assertEqual(updated, [(new_b, ["tags"])])

    def test_identical_entry_is_unchanged(self):
        _, added, updated, unchanged = self.run_merge([entry("A")])
        self.assertEqual((added, updated), ([], []))
        self.assertEqual([e["uuid"] for e in unchanged], ["A"])

    def test_deployed_input_is_not_mutated(self):
        self.run_merge([entry("B", text="# Changed"), entry("D")])
        self.assertEqual([e["uuid"] for e in self.deployed["entries"]], ["A", "B", "C"])
        self.assertEqual(self.deployed["entries"][1]["text"], "# Title")

    def test_duplicate_uuid_in_export_is_refused(self):
        with self.assertRaises(ValueError):
            self.run_merge([entry("D"), entry("D")])


class CliTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.deployed = self.write("deployed.json", {"metadata": {}, "entries": [entry("A")]})

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, name, data):
        path = self.dir / name
        path.write_text(json.dumps(data))
        return path

    def run_cli(self, export):
        out = self.dir / "merged.json"
        result = subprocess.run(
            [sys.executable, str(SCRIPT), str(self.deployed), str(export), "-o", str(out)],
            capture_output=True, text=True)
        return result, out

    def test_writes_merged_journal(self):
        result, out = self.run_cli(self.write("export.json", {"entries": [entry("B")]}))
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertEqual([e["uuid"] for e in json.loads(out.read_text())["entries"]], ["A", "B"])

    def test_nothing_to_change_exits_2_without_writing(self):
        result, out = self.run_cli(self.write("export.json", {"entries": [entry("A")]}))
        self.assertEqual(result.returncode, 2, result.stdout)
        self.assertFalse(out.exists())

    def test_entry_without_uuid_is_refused(self):
        result, out = self.run_cli(self.write("export.json", {"entries": [{"text": "x"}]}))
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertFalse(out.exists())


if __name__ == "__main__":
    unittest.main()
