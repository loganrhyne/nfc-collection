import sys,tempfile,unittest,json
from pathlib import Path
from unittest.mock import patch,AsyncMock,Mock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'python-services'))
import server
from services.tag_registry import TagRegistry
from services.nfc_service import WriteResult

class RegistrationFlowTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        journal=Path(self.tmp.name)/'journal.json'
        journal.write_text(json.dumps({'entries':[{'uuid':'ENTRY','creationDate':'2020-01-01','location':{'latitude':1,'longitude':2}}]}))
        self.registry=TagRegistry(self.tmp.name+'/registry.json',str(journal))
        self.nfc=Mock(busy=False)
        self.nfc.register_tag=AsyncMock(return_value=WriteResult(True,'AA',100))
        with patch.object(server,'NFCService',return_value=self.nfc),patch.object(server,'get_tag_registry',return_value=self.registry),patch.object(server,'LED_AVAILABLE',False):
            self.app=server.WebSocketServer()
        self.app.sio.emit=AsyncMock()
    async def asyncTearDown(self): self.tmp.cleanup()
    async def run_registration(self):
        await self.app.sio.handlers['/']['register_tag_start']('client',{'entry_id':'ENTRY'})
    async def test_success_persists_then_reports(self):
        await self.run_registration()
        self.assertEqual(self.registry.by_tag_uid('AA'),'ENTRY')
        self.assertEqual(self.app.sio.emit.call_args.args[0],'tag_registered')
    async def test_verified_write_storage_failure_is_explicit(self):
        with patch.object(self.registry,'save',side_effect=OSError('disk full')):
            await self.run_registration()
        event,data=self.app.sio.emit.call_args.args
        self.assertEqual(event,'registration_error')
        self.assertTrue(data['tag_written'])
        self.assertIsNone(self.registry.by_tag_uid('AA'))
    async def test_failed_write_does_not_register(self):
        self.nfc.register_tag.return_value=WriteResult(False,'AA',error='verification failed')
        await self.run_registration()
        self.assertIsNone(self.registry.by_tag_uid('AA'))
        self.assertEqual(self.app.sio.emit.call_args.args[0],'registration_error')
