"""End-to-end check of the migrated NFC path, entirely off-Pi."""
import asyncio, json, sys
import socketio, aiohttp

URL = "http://localhost:8099"

async def main():
    sio = socketio.AsyncClient()
    got = []
    handshake = {}

    @sio.event
    async def connected(data):
        handshake.update(data)

    @sio.on('tag_scanned')
    async def on_scan(data):
        got.append(data)
        print(f"  <- tag_scanned: entry_id={data.get('entry_id')!r} uid={data['tag_data']['tag_id']!r}")

    @sio.on('pong')
    async def on_pong(data):
        handshake['pong'] = data

    await sio.connect(URL)
    await asyncio.sleep(0.4)
    print(f"handshake: {json.dumps(handshake)}")

    # Heartbeat: the client sends epoch ms and expects it echoed back
    await sio.emit('ping', {'timestamp': 1234567890})
    await asyncio.sleep(0.4)
    print(f"pong echoed: {handshake.get('pong')}")

    async with aiohttp.ClientSession() as s:
        print("\ninjecting registered tag:")
        await s.post(f"{URL}/debug/scan", json={'entry_id': 'B219625035A240248F5D6AECBCE35B3E'})
        await asyncio.sleep(0.8)

        print("injecting UNREGISTERED tag:")
        await s.post(f"{URL}/debug/scan", json={'uid': 'MOCK:AA:BB:CC:DD'})
        await asyncio.sleep(0.8)

    await sio.disconnect()

    print("\n=== RESULTS ===")
    ok = True
    if len(got) != 2:
        print(f"FAIL: expected 2 tag_scanned events, got {len(got)}"); ok = False
    else:
        if got[0].get('entry_id') != 'B219625035A240248F5D6AECBCE35B3E':
            print("FAIL: registered tag did not carry entry_id"); ok = False
        if got[1].get('entry_id') is not None:
            print("FAIL: unregistered tag should have entry_id None"); ok = False
        if got[1]['tag_data']['tag_id'] != 'MOCK:AA:BB:CC:DD':
            print("FAIL: uid not propagated"); ok = False
    if handshake.get('pong', {}).get('timestamp') != 1234567890:
        print(f"FAIL: pong did not echo client timestamp: {handshake.get('pong')}"); ok = False
    if 'nfc_degraded' not in handshake or 'led_available' not in handshake:
        print("FAIL: handshake missing capability flags"); ok = False
    print("ALL CHECKS PASSED" if ok else "SOME CHECKS FAILED")
    return 0 if ok else 1

sys.exit(asyncio.run(main()))
