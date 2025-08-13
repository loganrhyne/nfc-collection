# NFC Write Cooldown Implementation

## Problem
After a successful NFC tag write, the continuous scanning would immediately detect the same tag and try to navigate to it, potentially triggering another write attempt if the user was still on the same entry page.

## Solution
Implemented a cooldown mechanism that prevents the same tag from being scanned for 10 seconds after a successful write.

### Changes Made:

1. **NFC Service (`nfc_service.py`)**:
   - Added `last_written_uid`, `last_write_time`, and `write_cooldown` properties
   - Track UID of successfully written tags
   - Skip scanning of recently written tags for 10 seconds
   - Log cooldown status for debugging

2. **React Modal (`NFCRegistrationModal.js`)**:
   - Ensure modal closes after successful write
   - Prevent re-registration attempts

### How It Works:

1. User clicks "Register Sample" and places tag on reader
2. Tag is written with entry data
3. Tag UID and current time are recorded
4. For the next 10 seconds, this tag is ignored by the scanner
5. After cooldown, tag can be scanned normally to navigate to entry

### Configuration:
- Cooldown period: 10 seconds (adjustable via `self.write_cooldown`)
- Normal scan debounce: 3 seconds (prevents rapid re-reads)

This provides a smooth user experience where:
- Tags can be written without immediate re-scanning
- Users have time to remove the tag after writing
- The system doesn't get stuck in write loops