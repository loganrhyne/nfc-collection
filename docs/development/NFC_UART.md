# NFC reader over UART

The production reader uses PN532 HSU and nfcpy 1.0.4. Both module switches are OFF. Switch mode is sampled at power-up; disconnect reader power when changing it.

Pi 5 configuration: `dtoverlay=uart0-pi5` in `/boot/firmware/config.txt`. PN532 TXD connects to GPIO15 (physical 10); RXD connects to GPIO14 (physical 8). Keep the existing verified power and common ground connections. `/dev/serial0` may refer to the separate debug UART: use `NFC_DEVICE=tty:AMA0:pn532`. The service account needs the `dialout` group.

Install `python-services/requirements.txt` in the service virtualenv. GPIO/LED dependencies remain separate. `NFC_MOCK_MODE=true` enables explicit development simulation; unavailable hardware never silently becomes mock hardware.

## Ownership and registration

`nfc_service.py` owns reader open, polling, writes and close on one worker thread. `nfc_backend.py` adapts nfcpy. `nfc_codec.py` validates existing v1 JSON metadata and stores it as an NDEF text record. Type and capacity come from the activated tag; no UID-prefix inference or page arithmetic remains.

Registration captures a UID, rejects a binding to another entry, writes, reactivates and compares all NDEF bytes before registry persistence. A retry reads first to handle a lost write acknowledgement. It never switches to another UID. Cancellation before writing prevents mutation; a write already in progress finishes verification and is registered if successful. Partial physical writes remain possible if the tag is removed; failures do not create a registry binding.

If persistence fails after verification, the UI explicitly reports that the tag was written. Correct the storage failure and retry registration for the same entry/tag. Existing grid positions are retained. An unreadable registry blocks registration instead of overwriting it.

Health includes connection, phase, last error, polling age and latest tag read error. Standalone diagnostics must run with nfc-server stopped to avoid competing reader owners.

## Verification

Run `python -m unittest discover -s tests -p 'test_nfc*.py'` with dependencies installed. Hardware acceptance covers legacy records, 1D and 5A tag families, a complete metadata write, scan suppression, removal during write, and service restart. Genuine Type 4 hardware remains unverified until an actual Type 4 tag is available; all tags tested during the UART migration identified as Type 2.

## Rollback

Back up the deployed service, configuration and registry before updating. Software rollback alone cannot restore the previous SPI driver while the reader is wired for UART: restoring that version also requires powered-off SPI rewiring and switch settings. Do not replace the live registry with an older backup during code rollback.
