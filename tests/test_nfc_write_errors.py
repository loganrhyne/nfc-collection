"""The NFC writer must preserve where a failed tag write stopped."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'python-services'))

from config import NFCConfig
from services.nfc_service import NFCService, TagInfo, TagType


class FakeReader:
    def __init__(self, failing_page, failing_phase):
        self.failing_page = failing_page
        self.failing_phase = failing_phase
        self.calls = []

    def ntag2xx_write_block(self, page, data):
        self.calls.append((page, data))
        phase = 'clearing' if (len(self.calls) - 1) % self.calls_per_attempt < 4 else 'writing'
        return not (page == self.failing_page and phase == self.failing_phase)


class NFCWriteErrorsTest(unittest.TestCase):
    def make_service(self, failing_page, failing_phase):
        config = NFCConfig(mock_mode=True, write_retry_attempts=2,
                           write_retry_delay=0)
        service = NFCService(nfc_config=config)
        config.mock_mode = False
        reader = FakeReader(failing_page, failing_phase)
        reader.calls_per_attempt = 4 if failing_phase == 'clearing' else 4 + failing_page - 3
        service._pn532 = reader
        return service

    def write(self, service):
        tag = TagInfo(uid='04:01:02:03:04:05:06', type=TagType.NTAG213,
                      capacity=144)
        payload = {'v': 1, 'id': 'ENTRY', 'geo': [1, 2], 'ts': 1}
        with patch('services.nfc_service.time.sleep'):
            return service._do_write(tag, payload)

    def test_reports_clear_page_failure(self):
        result = self.write(self.make_service(6, 'clearing'))
        self.assertFalse(result.success)
        self.assertIn('clearing page 6', result.error)
        self.assertIn('after 2 attempts', result.error)

    def test_reports_payload_page_failure(self):
        result = self.write(self.make_service(9, 'writing'))
        self.assertFalse(result.success)
        self.assertIn('writing page 9', result.error)
        self.assertIn('after 2 attempts', result.error)


if __name__ == '__main__':
    unittest.main()
