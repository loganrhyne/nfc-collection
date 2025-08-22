# NFC Scanning Improvements for Cradle-Based Interaction

## Overview
Updated the NFC scanning logic to better support the physical interaction model where viewers place sand samples on a cradle above the reader and leave them there for extended periods.

## Previous Behavior
- 3-second debounce delay before emitting scan events
- 10-second cooldown after writing to a tag
- Continuous events for the same tag

## New Behavior
1. **Immediate response**: When a tag is placed on the reader, the app is notified immediately
2. **No duplicate events**: While a tag remains on the cradle, no additional events are sent
3. **Grace period**: Tag must be absent for 1.5 seconds before considered "removed"
4. **Clean re-scan**: After removal, the same tag triggers a new event when placed again

## Implementation Details

### ScanState Class
Added a new `ScanState` class that tracks:
- Currently present tag ID
- Last time the tag was seen
- Grace period for tag removal (1.5 seconds)
- Write mode flag to suppress scans during write operations

### Key Methods
- `should_emit_event()`: Determines if a scan should trigger an event
- `process_no_tag_detected()`: Handles absence of tags with grace period
- `set_write_mode()`: Prevents scan events during write operations

### Write Operation Protection
During tag writing:
1. Scan events are suppressed to prevent interference
2. After write completes, scan state is cleared
3. Next scan of the written tag will emit an event

## Configuration Changes
Removed dependency on:
- `NFC_SCAN_DEBOUNCE` (was 3.0 seconds)
- `NFC_WRITE_COOLDOWN` (was 10.0 seconds)

## Benefits
1. **Faster response**: Users see immediate feedback when placing a sample
2. **Cleaner interaction**: No event spam while sample sits on cradle
3. **Natural behavior**: Removing and replacing a sample works as expected
4. **Reliable writes**: Write operations are protected from scan interference

## Testing Recommendations
1. Place a tag on the reader - should see immediate response
2. Leave tag in place - no additional events should fire
3. Remove tag briefly (<1.5s) and replace - no new event
4. Remove tag for >1.5s and replace - new event fires
5. Test write operation - scan events should resume after write completes