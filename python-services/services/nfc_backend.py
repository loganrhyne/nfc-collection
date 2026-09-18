"""Synchronous nfcpy adapter. All calls belong to the reader thread."""
import time
import nfc


class NfcpyBackend:
    def __init__(self, device):
        self.device = device
        self.clf = None

    def open(self):
        self.close()
        self.clf = nfc.ContactlessFrontend(self.device)

    def close(self):
        if self.clf is not None:
            self.clf.close()
            self.clf = None

    def poll(self):
        target = self.clf.sense(nfc.clf.RemoteTarget('106A'),
                                nfc.clf.RemoteTarget('106B'), iterations=1)
        return nfc.tag.activate(self.clf, target) if target else None

    @staticmethod
    def uid(tag):
        return bytes(tag.identifier).hex(':').upper()

    @staticmethod
    def read(tag):
        data = tag.ndef
        if data is None:
            return None
        return bytes(data.octets)

    @staticmethod
    def write(tag, payload):
        data = tag.ndef
        if data is None:
            raise ValueError('Tag has no supported NDEF area; automatic formatting is disabled')
        if not data.is_writeable:
            raise ValueError('Tag is read-only')
        if len(payload) > data.capacity:
            raise ValueError(f'Record needs {len(payload)} bytes; tag capacity is {data.capacity}')
        data.octets = payload

    def reselect(self):
        self.clf.mute()
        time.sleep(0.1)
        return self.poll()
