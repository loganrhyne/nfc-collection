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

    async def test_nfc_scan_wakes_even_without_a_journal_id(self):
        self.app.idle.activity = AsyncMock()
        await self.app.on_tag_scanned({'uid': 'AA', 'data': None})
        self.app.idle.activity.assert_awaited_once_with('nfc')
        self.assertEqual(self.app.sio.emit.call_args.args[0], 'tag_scanned')

    async def test_same_sample_scan_is_activity_each_time(self):
        self.app.idle.activity = AsyncMock()
        event = {'uid': 'AA', 'data': {'id': 'ENTRY'}}
        await self.app.on_tag_scanned(event)
        await self.app.on_tag_scanned(event)
        self.assertEqual(self.app.idle.activity.await_count, 2)

    async def test_heartbeat_and_new_browser_do_not_reset_idle(self):
        self.app.idle.activity = AsyncMock()
        self.nfc.get_status.return_value = {'hardware_available': True}
        await self.app.sio.handlers['/']['ping']('client', {'timestamp': 1})
        await self.app.sio.handlers['/']['connect']('client', {})
        self.app.idle.activity.assert_not_awaited()

    async def test_browser_activity_uses_shared_backend_timer(self):
        self.app.idle.activity = AsyncMock()
        await self.app.sio.handlers['/']['user_activity']('a', {})
        await self.app.sio.handlers['/']['user_activity']('b', {})
        self.assertEqual(self.app.idle.activity.await_count, 2)

    async def test_clear_registration_broadcasts_saved_state(self):
        self.registry.register('ENTRY', 'AA')
        await self.app.sio.handlers['/']['remove_sample_registration']('client', {'entry_id': 'ENTRY'})
        self.assertIsNone(self.registry.by_tag_uid('AA'))
        self.assertFalse(self.registry.recover_scanned_registration('ENTRY', 'AA'))
        self.app.sio.emit.assert_any_await('sample_locations', {'samples': {}})
        self.assertEqual(self.app.sio.emit.call_args.args[0], 'sample_registration_removed')

    async def test_clear_registration_rejected_while_reader_busy(self):
        self.registry.register('ENTRY', 'AA')
        self.nfc.busy = True
        await self.app.sio.handlers['/']['remove_sample_registration']('client', {'entry_id': 'ENTRY'})
        self.assertEqual(self.registry.by_tag_uid('AA'), 'ENTRY')
        self.assertEqual(self.app.sio.emit.call_args.args[0], 'sample_registration_remove_error')

    async def test_conflicting_tag_reports_confirmation_without_mutation(self):
        self.nfc.register_tag.side_effect = server.NFCRegistrationConflict('AA', 'OLD')
        await self.run_registration()
        event, data = self.app.sio.emit.call_args.args
        self.assertEqual(event, 'registration_conflict')
        self.assertEqual(data['tag_uid'], 'AA')
        self.assertIsNone(self.registry.by_tag_uid('AA'))

    async def test_confirmed_replacement_moves_verified_binding(self):
        self.registry.register('OLD', 'AA', grid_index=4)
        await self.app.sio.handlers['/']['register_tag_start']('client', {
            'entry_id': 'ENTRY', 'overwrite_tag_uid': 'AA', 'overwrite_entry_id': 'OLD'})
        self.assertEqual(self.registry.by_tag_uid('AA'), 'ENTRY')
        self.assertNotIn('OLD', self.registry._entries)
        self.assertEqual(self.nfc.register_tag.call_args.kwargs['overwrite_uid'], 'AA')
