"""Registration invariants, independent of physical reader hardware."""
import sys,time,tempfile,unittest,asyncio
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'python-services'))
from config import NFCConfig
from services.nfc_service import NFCService,Command,NFCDataError,NFCCancelledError
from services import nfc_codec
from services.tag_registry import TagRegistry

PAYLOAD={'v':1,'id':'4249895F4D7F4FE3A34F09D01E4C0391','geo':[48.63589859008789,-1.5094720125198364],'ts':1234}

class Tag:
    def __init__(self,uid='AA'): self.uid=uid

class Backend:
    def __init__(self):
        self.tag=Tag(); self.raw=b''; self.writes=0; self.corrupt=False
        self.lost_ack=False; self.swapped=False
    def poll(self): return self.tag
    def uid(self,tag): return tag.uid
    def read(self,tag): return self.raw
    def write(self,tag,payload):
        self.writes+=1
        self.raw=payload if not self.corrupt else nfc_codec.encode(dict(PAYLOAD,geo=[0,0]))
        if self.lost_ack: raise IOError('Lost acknowledgement')
    def reselect(self): return Tag('BB') if self.swapped else self.tag
    def close(self): pass

class WriterTests(unittest.TestCase):
    def setUp(self):
        self.backend=Backend()
        self.service=NFCService(NFCConfig(write_retry_delay=0),backend=self.backend)
        self.command=Command(PAYLOAD,time.monotonic()+5,{})
    def test_exact_record_roundtrip(self):
        result=self.service._register(self.command)
        self.assertTrue(result.success)
        self.assertEqual(nfc_codec.decode(self.backend.raw),PAYLOAD)
    def test_same_id_wrong_coordinates_fails(self):
        self.backend.corrupt=True
        self.assertFalse(self.service._register(self.command).success)
    def test_lost_ack_checks_before_rewriting(self):
        self.backend.lost_ack=True
        self.assertTrue(self.service._register(self.command).success)
        self.assertEqual(self.backend.writes,1)
    def test_swapped_tag_aborts(self):
        self.backend.swapped=True
        with self.assertRaises(NFCDataError): self.service._register(self.command)
        self.assertEqual(self.backend.writes,1)
    def test_registry_conflict_prevents_write(self):
        self.command.bindings={'AA':'OTHER'}
        with self.assertRaises(NFCDataError): self.service._register(self.command)
        self.assertEqual(self.backend.writes,0)
    def test_cancellation_prevents_write(self):
        self.command.cancel.set()
        with self.assertRaises(NFCCancelledError): self.service._register(self.command)
        self.assertEqual(self.backend.writes,0)
    def test_cancel_during_successful_write_still_verifies(self):
        original=self.backend.write
        def write(tag,payload):
            original(tag,payload); self.command.cancel.set()
        self.backend.write=write
        self.assertTrue(self.service._register(self.command).success)
    def test_stationary_tag_emits_once(self):
        self.backend.raw=nfc_codec.encode(PAYLOAD)
        self.service._poll(); self.service._poll()
        self.assertEqual(self.service._events.qsize(),1)
    def test_no_tag_does_not_emit(self):
        self.backend.tag=None
        self.service._poll()
        self.assertTrue(self.service._events.empty())
    def test_existing_verified_record_not_rewritten(self):
        self.backend.raw=nfc_codec.encode(PAYLOAD)
        self.assertTrue(self.service._register(self.command).success)
        self.assertEqual(self.backend.writes,0)

class RegistryTests(unittest.TestCase):
    def test_save_failure_does_not_change_binding(self):
        with tempfile.TemporaryDirectory() as tmp:
            registry=TagRegistry(tmp+'/registry.json',tmp+'/missing.json')
            with patch.object(registry,'save',side_effect=OSError('disk full')):
                with self.assertRaises(OSError): registry.register('ENTRY','AA')
            self.assertIsNone(registry.by_tag_uid('AA'))
    def test_reregistration_preserves_placement(self):
        with tempfile.TemporaryDirectory() as tmp:
            registry=TagRegistry(tmp+'/registry.json',tmp+'/missing.json')
            registry.register('ENTRY','AA',grid_index=25)
            self.assertEqual(registry.register('ENTRY','AA')['grid_index'],25)
    def test_corrupt_registry_refuses_mutation(self):
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp+'/registry.json').write_text('{bad')
            registry=TagRegistry(tmp+'/registry.json',tmp+'/missing.json')
            with self.assertRaises(RuntimeError): registry.bindings()
            with self.assertRaises(RuntimeError): registry.register('ENTRY','AA')

if __name__=='__main__': unittest.main()
