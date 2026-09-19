"""Exercise the real nfcpy frontend API without a physical transport."""
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch, sentinel
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'python-services'))
import nfc
from services.nfc_backend import NfcpyBackend

class ReactivationTests(unittest.TestCase):
    def test_reselect_cycles_field_and_activates_a_fresh_tag(self):
        backend = NfcpyBackend('tty:AMA0:pn532')
        backend.clf = nfc.ContactlessFrontend()
        device = Mock()
        backend.clf.device = device
        target = nfc.clf.RemoteTarget('106A', sens_res=bytes.fromhex('4400'),
                                     sel_res=b'\x00', sdd_res=bytes.fromhex('1DDC3CDE091080'))
        device.sense_tta.return_value = target
        backend.clf.target = sentinel.previous_target
        with patch('services.nfc_backend.nfc.tag.activate', return_value=sentinel.fresh_tag) as activate:
            self.assertIs(backend.reselect(), sentinel.fresh_tag)
            activate.assert_called_once_with(backend.clf, target)
        self.assertGreaterEqual(device.mute.call_count, 2)
        device.sense_tta.assert_called_once()

    def test_removed_tag_returns_none(self):
        backend = NfcpyBackend('tty:AMA0:pn532')
        backend.clf = nfc.ContactlessFrontend()
        backend.clf.device = Mock()
        backend.clf.device.sense_tta.return_value = None
        backend.clf.device.sense_ttb.return_value = None
        self.assertIsNone(backend.reselect())

if __name__ == '__main__': unittest.main()
