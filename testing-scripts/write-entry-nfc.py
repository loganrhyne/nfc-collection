import board
import busio
from digitalio import DigitalInOut
from adafruit_pn532.spi import PN532_SPI
import time
import json

def setup_pn532():
    """Initialize the PN532 NFC reader"""
    # Configure SPI bus
    spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
    # Chip Select on GPIO25
    cs_pin = DigitalInOut(board.D25)
    pn532 = PN532_SPI(spi, cs_pin, debug=False)
    
    # Check PN532 firmware version
    try:
        ic, ver, rev, support = pn532.firmware_version
        print(f"PN532 Firmware Version: {ver}.{rev}")
    except Exception as e:
        print(f"Failed to read PN532 firmware: {e}")
        return None
    
    # Configure PN532 to communicate with NFC tags
    pn532.SAM_configuration()
    return pn532

def create_text_record(text, language="en"):
    """Create an NDEF Text record"""
    # Text record format:
    # TNF = 0x01 (Well Known)
    # Type = "T" (Text)
    # Payload = [status_byte][language_code][text]
    
    # Status byte: bit 7 = 0 (UTF-8), bits 5-0 = language code length
    status_byte = len(language) & 0x3F  # UTF-8, language code length
    
    # Build payload
    text_payload = bytes([status_byte]) + language.encode('utf-8') + text.encode('utf-8')
    
    # NDEF record header
    tnf = 0x01  # Well Known Type
    type_field = b"T"
    
    return create_ndef_record(tnf, type_field, text_payload)

def create_multi_record_ndef(records):
    """Combine multiple NDEF records into a single message"""
    if not records:
        return b""
    
    # Update flags for multiple records
    combined = b""
    
    for i, record in enumerate(records):
        # Get the existing flags byte
        flags = record[0]
        
        # Clear MB and ME bits
        flags &= ~0xC0
        
        # Set MB (Message Begin) for first record
        if i == 0:
            flags |= 0x80
        
        # Set ME (Message End) for last record  
        if i == len(records) - 1:
            flags |= 0x40
            
        # Rebuild record with updated flags
        updated_record = bytes([flags]) + record[1:]
        combined += updated_record
    
    return combined

def create_uri_record(uri):
    """Create an NDEF URI record"""
    # NDEF URI record format:
    # TNF (Type Name Format) = 0x01 (Well Known)
    # Type = "U" (URI)
    # Payload = URI identifier code + URI
    
    # URI identifier codes (we'll use 0x00 for no abbreviation)
    uri_payload = bytes([0x00]) + uri.encode('utf-8')
    
    # NDEF record header
    tnf = 0x01  # Well Known Type
    type_field = b"U"
    
    return create_ndef_record(tnf, type_field, uri_payload)

def create_ndef_record(tnf, type_field, payload, first=False, last=False):
    """Create a properly formatted NDEF record"""
    # NDEF record flags
    flags = tnf & 0x07  # Keep only TNF bits
    if first:
        flags |= 0x80  # MB (Message Begin)
    if last:
        flags |= 0x40  # ME (Message End)
    flags |= 0x10  # SR (Short Record - payload length < 256 bytes)
    
    # Record structure: [Flags][Type Length][Payload Length][Type][Payload]
    record = bytes([flags])
    record += bytes([len(type_field)])
    record += bytes([len(payload)])
    record += type_field
    record += payload
    
    return record

def detect_card_type(uid):
    """Try to detect card type based on UID"""
    if len(uid) == 7:
        # 7-byte UID typically indicates NTAG or newer cards
        return "NTAG"
    elif len(uid) == 4:
        # 4-byte UID typically indicates MIFARE Classic
        return "MIFARE_CLASSIC"
    else:
        return "UNKNOWN"

def write_mifare_classic(pn532, uid, ndef_data):
    """Write NDEF data to MIFARE Classic card"""
    print("Attempting MIFARE Classic write...")
    
    # Try both common default keys
    keys_to_try = [
        [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF],  # Factory default
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00],  # Alternative default
        [0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5],  # Another common default
    ]
    
    for key in keys_to_try:
        try:
            print(f"Trying key: {[hex(k) for k in key]}")
            
            # Try to authenticate block 4
            if pn532.mifare_classic_authenticate_block(uid, 4, 0x60, key):
                print("Authentication successful!")
                
                # Write data starting from block 4
                blocks_needed = (len(ndef_data) + 15) // 16
                
                for block_num in range(blocks_needed):
                    # Skip trailer blocks (every 4th block starting from 3)
                    if (block_num + 4) % 4 == 3:
                        continue
                        
                    actual_block = block_num + 4
                    
                    # Re-authenticate for each block
                    if not pn532.mifare_classic_authenticate_block(uid, actual_block, 0x60, key):
                        print(f"Re-authentication failed for block {actual_block}")
                        continue
                    
                    # Prepare block data
                    start_idx = block_num * 16
                    end_idx = min(start_idx + 16, len(ndef_data))
                    block_data = list(ndef_data[start_idx:end_idx])
                    
                    # Pad to 16 bytes
                    while len(block_data) < 16:
                        block_data.append(0x00)
                    
                    # Write the block
                    if pn532.mifare_classic_write_block(actual_block, block_data):
                        print(f"Wrote block {actual_block}")
                    else:
                        print(f"Failed to write block {actual_block}")
                        return False
                    
                    if end_idx >= len(ndef_data):
                        break
                
                return True
                
        except Exception as e:
            print(f"Error with key {[hex(k) for k in key]}: {e}")
            continue
    
    return False

def read_ntag_info(pn532, uid):
    """Try to read NTAG capability container and memory info"""
    print("Reading NTAG information...")
    
    try:
        # Try to read page 3 (capability container)
        if hasattr(pn532, 'ntag2xx_read_block'):
            cc_data = pn532.ntag2xx_read_block(3)
            if cc_data:
                print(f"Capability Container (page 3): {[hex(b) for b in cc_data]}")
                # Byte 2 is memory size, byte 3 is read/write access
                if len(cc_data) >= 4:
                    memory_size = cc_data[2]
                    access_conditions = cc_data[3]
                    print(f"Memory size indicator: 0x{memory_size:02x}")
                    print(f"Access conditions: 0x{access_conditions:02x}")
        
        # Try to read a few pages around page 18 to see what's there
        problematic_pages = [16, 17, 18, 19, 20]
        for page in problematic_pages:
            try:
                if hasattr(pn532, 'ntag2xx_read_block'):
                    data = pn532.ntag2xx_read_block(page)
                    if data:
                        print(f"Page {page}: {[hex(b) for b in data]}")
                    else:
                        print(f"Page {page}: Read failed")
            except Exception as e:
                print(f"Page {page}: Error reading - {e}")
    
    except Exception as e:
        print(f"Error reading NTAG info: {e}")

def get_ntag_memory_info(uid):
    """Get memory information for NTAG chips based on UID"""
    # Common NTAG memory layouts
    ntag_types = {
        # NTAG213: 180 bytes total, 144 bytes user memory, last user page ~39
        'NTAG213': {'total_pages': 45, 'user_start': 4, 'user_end': 39},
        # NTAG215: 540 bytes total, 504 bytes user memory, last user page ~129  
        'NTAG215': {'total_pages': 135, 'user_start': 4, 'user_end': 129},
        # NTAG216: 928 bytes total, 892 bytes user memory, last user page ~225
        'NTAG216': {'total_pages': 231, 'user_start': 4, 'user_end': 225}
    }
    
    # Try to detect NTAG type (this is a best guess based on common patterns)
    # In practice, you might need to read the capability container or use other detection
    return ntag_types['NTAG213']  # Default to most restrictive

def clear_ntag_data(pn532, uid):
    """Try to clear existing NDEF data from NTAG"""
    print("Attempting to clear existing NDEF data...")
    
    try:
        # Check what NTAG methods are available
        available_methods = []
        ntag_methods = ['ntag2xx_write_page', 'ntag2xx_write_block', 'write_page', 'write_block']
        
        for method in ntag_methods:
            if hasattr(pn532, method):
                available_methods.append(method)
        
        if not available_methods:
            print("No write methods available for clearing")
            return False
        
        method_name = available_methods[0]
        method = getattr(pn532, method_name)
        
        # Clear pages 4-25 (where data typically goes)
        for page in range(4, 26):
            try:
                empty_page = [0x00, 0x00, 0x00, 0x00]
                if method(page, empty_page):
                    print(f"Cleared page {page}")
                else:
                    print(f"Failed to clear page {page}")
                    # Don't return False here, continue trying other pages
            except Exception as e:
                print(f"Error clearing page {page}: {e}")
                continue
        
        return True
        
    except Exception as e:
        print(f"Error in clear operation: {e}")
        return False

def check_write_protection(pn532, uid):
    """Check if NTAG has write protection enabled"""
    print("Checking for write protection...")
    
    try:
        # Read lock pages (pages 2 and 3 contain lock information)
        if hasattr(pn532, 'ntag2xx_read_block'):
            # Page 2 contains lock bytes
            lock_data = pn532.ntag2xx_read_block(2)
            if lock_data and len(lock_data) >= 4:
                print(f"Lock bytes (page 2): {[hex(b) for b in lock_data]}")
                
                # Check lock bits
                lock0 = lock_data[2]  # Lock byte 0
                lock1 = lock_data[3]  # Lock byte 1
                
                if lock0 != 0x00 or lock1 != 0x00:
                    print(f"⚠️  Warning: Lock bits detected! Lock0: 0x{lock0:02x}, Lock1: 0x{lock1:02x}")
                    return True
                else:
                    print("✅ No lock bits detected")
                    return False
            
            # Also check capability container for write protection
            cc_data = pn532.ntag2xx_read_block(3)
            if cc_data and len(cc_data) >= 4:
                access_byte = cc_data[3]
                if access_byte != 0x00:
                    print(f"⚠️  Access control byte indicates restrictions: 0x{access_byte:02x}")
                    if access_byte & 0x0F != 0x00:  # Write access bits
                        print("⚠️  Write access may be restricted")
                        return True
                        
    except Exception as e:
        print(f"Error checking write protection: {e}")
    
    return False

def diagnose_tag_issue(pn532, uid):
    """Diagnose why NDEF writes are failing"""
    print("\n=== TAG DIAGNOSTICS ===")
    
    try:
        method = getattr(pn532, 'ntag2xx_write_block')
        
        # Test 1: Can we write different patterns?
        print("\nTest 1: Testing different data patterns on page 4...")
        test_patterns = [
            ([0xAA, 0xBB, 0xCC, 0xDD], "Test pattern"),
            ([0x00, 0x00, 0x00, 0x00], "Zeros"),
            ([0xFF, 0xFF, 0xFF, 0xFF], "All FF"),
            ([0x01, 0x02, 0x03, 0x04], "Sequential"),
            ([0x03, 0x00, 0x00, 0x00], "NDEF start only"),
            ([0x03, 0x54, 0x00, 0x00], "NDEF with length"),
            ([0x03, 0x54, 0xD1, 0x00], "NDEF with header"),
            ([0x03, 0x54, 0xD1, 0x01], "Full NDEF header"),
        ]
        
        for pattern, description in test_patterns:
            try:
                result = method(4, pattern)
                if result:
                    # Try to read back
                    read_back = pn532.ntag2xx_read_block(4)
                    if read_back and list(read_back) == pattern:
                        print(f"  ✅ {description}: Write and verify OK")
                    else:
                        print(f"  ⚠️  {description}: Write OK but verify failed")
                else:
                    print(f"  ❌ {description}: Write failed")
            except Exception as e:
                print(f"  ❌ {description}: Exception - {e}")
            time.sleep(0.1)
        
        # Test 2: Check current page 4 content
        print("\nTest 2: Current page 4 content...")
        try:
            current = pn532.ntag2xx_read_block(4)
            print(f"  Current data: {[hex(b) for b in current] if current else 'Read failed'}")
            
            if current and current[0] == 0x03:
                print("  ⚠️  Page 4 contains NDEF data (starts with 0x03)")
                print("  This might be why new NDEF writes fail!")
        except:
            print("  Could not read current content")
        
        print("\n=== END DIAGNOSTICS ===\n")
        
    except Exception as e:
        print(f"Diagnostic error: {e}")

def test_basic_write(pn532, uid):
    """Test basic write functionality with minimal data"""
    print("Testing basic write functionality...")
    
    # Check what methods are available
    available_methods = []
    ntag_methods = ['ntag2xx_write_page', 'ntag2xx_write_block', 'write_page', 'write_block']
    
    for method in ntag_methods:
        if hasattr(pn532, method):
            available_methods.append(method)
    
    print(f"Available methods: {available_methods}")
    
    if not available_methods:
        print("No write methods available!")
        return False
    
    # Try writing a simple test pattern to page 4
    method_name = available_methods[0]
    method = getattr(pn532, method_name)
    
    test_data = [0xAA, 0xBB, 0xCC, 0xDD]  # Simple test pattern
    
    try:
        print(f"Attempting to write test data {[hex(b) for b in test_data]} to page 4...")
        result = method(4, test_data)
        print(f"Write result: {result}")
        print(f"Write result type: {type(result)}")
        
        if result:
            # Try to read it back
            if hasattr(pn532, 'ntag2xx_read_block'):
                read_data = pn532.ntag2xx_read_block(4)
                print(f"Read back: {[hex(b) for b in read_data] if read_data else 'Read failed'}")
                print(f"Read data type: {type(read_data)}")
                print(f"Original data: {test_data}")
                print(f"Read data as list: {list(read_data) if read_data else None}")
                
                if read_data:
                    # Convert to list for comparison
                    read_list = list(read_data)
                    match = read_list == test_data
                    print(f"Data match: {match}")
                    return match
                else:
                    print("Read failed, but write returned True")
                    return False
            else:
                print("Cannot verify write - no read method available")
                return True
        else:
            print("Write returned False")
            return False
            
    except Exception as e:
        print(f"Exception during test write: {e}")
        return False

# NEW FIXED WRITE FUNCTIONS

def force_clear_ndef(pn532, uid):
    """Force clear NDEF by writing specific patterns"""
    print("Force clearing NDEF...")
    
    try:
        method = getattr(pn532, 'ntag2xx_write_block')
        
        # Step 1: Overwrite NDEF start with invalid data
        patterns = [
            [0xFF, 0xFF, 0xFF, 0xFF],  # All FF
            [0xFE, 0x00, 0x00, 0x00],  # Terminator first
            [0x00, 0x00, 0x00, 0x00],  # All zeros
        ]
        
        for pattern in patterns:
            print(f"  Trying pattern: {[hex(b) for b in pattern]}")
            result = method(4, pattern)
            if result:
                print(f"    ✅ Written")
                time.sleep(0.2)
                # Now try to write zeros
                result = method(4, [0x00, 0x00, 0x00, 0x00])
                if result:
                    print(f"    ✅ Cleared")
                    return True
            else:
                print(f"    ❌ Failed")
        
        return False
        
    except Exception as e:
        print(f"Error in force clear: {e}")
        return False

def write_ntag_with_force_clear(pn532, uid, ndef_data):
    """Write NDEF after force clearing"""
    print("Attempting write with force clear...")
    
    # Force clear first
    if force_clear_ndef(pn532, uid):
        print("Force clear successful, now writing NDEF...")
        time.sleep(0.5)
        # Use the gradual write approach after clearing
        return write_ntag_gradual(pn532, uid, ndef_data)
    else:
        print("Force clear failed")
        return False

def write_ntag_format_tag(pn532, uid):
    """Format the tag by writing specific patterns to bypass NDEF validation"""
    print("Attempting to format tag...")
    
    try:
        method = getattr(pn532, 'ntag2xx_write_block')
        
        # Step 1: Write non-NDEF data to page 4 to break NDEF structure
        print("Step 1: Breaking NDEF structure...")
        non_ndef_data = [0xFF, 0xFF, 0xFF, 0xFF]  # Non-NDEF pattern
        
        result = method(4, non_ndef_data)
        if result:
            print("  ✅ Broke NDEF structure")
        else:
            print("  ⚠️  Failed to break NDEF structure")
            
        time.sleep(0.2)
        
        # Step 2: Now write zeros to clear
        print("Step 2: Clearing pages...")
        empty_data = [0x00, 0x00, 0x00, 0x00]
        
        for page in range(4, 26):  # Clear all potential NDEF pages
            try:
                result = method(page, empty_data)
                if result:
                    print(f"  Cleared page {page}")
                else:
                    print(f"  Failed to clear page {page}")
            except:
                pass
            time.sleep(0.05)
        
        time.sleep(0.5)
        return True
        
    except Exception as e:
        print(f"Error formatting tag: {e}")
        return False

def write_ntag_gradual(pn532, uid, ndef_data):
    """Write NDEF data gradually, starting with non-NDEF then converting"""
    print("Attempting gradual NDEF write...")
    
    try:
        method = getattr(pn532, 'ntag2xx_write_block')
        
        # First, format the tag
        if not write_ntag_format_tag(pn532, uid):
            print("Format failed, continuing anyway...")
        
        # Step 1: Write the URI data first WITHOUT NDEF wrapper
        print("\nStep 1: Writing raw URI data...")
        uri_start = 4  # Skip NDEF header bytes
        
        # Write everything except the NDEF header
        start_page = 4
        pages_to_write = []
        
        # Prepare all pages first
        pages_needed = (len(ndef_data) + 3) // 4
        for page_num in range(pages_needed):
            start_idx = page_num * 4
            end_idx = min(start_idx + 4, len(ndef_data))
            page_data = list(ndef_data[start_idx:end_idx])
            
            while len(page_data) < 4:
                page_data.append(0x00)
                
            pages_to_write.append(page_data)
        
        # Write all pages EXCEPT the first one
        for i in range(1, len(pages_to_write)):
            actual_page = start_page + i
            
            print(f"Writing page {actual_page}: {[hex(b) for b in pages_to_write[i]]}")
            result = method(actual_page, pages_to_write[i])
            
            if result:
                print(f"  ✅ Success")
            else:
                print(f"  ❌ Failed")
                return False
            
            time.sleep(0.1)
        
        # Step 2: Finally write the NDEF header
        print("\nStep 2: Writing NDEF header...")
        time.sleep(0.5)  # Longer delay before NDEF header
        
        print(f"Writing page 4 (NDEF header): {[hex(b) for b in pages_to_write[0]]}")
        result = method(4, pages_to_write[0])
        
        if result:
            print(f"  ✅ NDEF header written!")
            return True
        else:
            print(f"  ❌ NDEF header failed")
            return False
            
    except Exception as e:
        print(f"Error in gradual write: {e}")
        return False

def write_ntag_raw_command(pn532, uid, ndef_data):
    """Use raw PN532 InDataExchange command to write NTAG"""
    print("Attempting raw PN532 command write...")
    
    try:
        # First format the tag
        write_ntag_format_tag(pn532, uid)
        
        # Check if we have the raw command interface
        if not hasattr(pn532, '_write_data') or not hasattr(pn532, '_read_data'):
            print("Raw command interface not available")
            return False
        
        # NTAG write command is 0xA2
        NTAG_WRITE = 0xA2
        
        start_page = 4
        pages_needed = (len(ndef_data) + 3) // 4
        
        print(f"Writing {len(ndef_data)} bytes using raw commands...")
        
        for page_num in range(pages_needed):
            actual_page = start_page + page_num
            
            # Prepare page data
            start_idx = page_num * 4
            end_idx = min(start_idx + 4, len(ndef_data))
            page_data = list(ndef_data[start_idx:end_idx])
            
            while len(page_data) < 4:
                page_data.append(0x00)
            
            print(f"Writing page {actual_page}: {[hex(b) for b in page_data]}")
            
            # Build raw command
            # InDataExchange: [Tg, NTAG_WRITE, Page, Data0, Data1, Data2, Data3]
            command = [0x01, NTAG_WRITE, actual_page] + page_data
            
            try:
                # Send command using raw interface
                pn532._write_data(bytearray([0x40] + command))  # 0x40 = InDataExchange
                time.sleep(0.1)  # Give time for response
                
                # Read response
                response = pn532._read_data(20)  # Read up to 20 bytes
                
                if response and len(response) > 2:
                    if response[0] == 0x41 and response[1] == 0x00:  # Success
                        print(f"  ✅ Page {actual_page} written")
                    else:
                        print(f"  ❌ Error response: {[hex(b) for b in response]}")
                        return False
                else:
                    print(f"  ❌ No/invalid response")
                    return False
                    
            except Exception as e:
                print(f"  ❌ Error writing page {actual_page}: {e}")
                return False
            
            if end_idx >= len(ndef_data):
                break
            
            time.sleep(0.1)  # Delay between pages
        
        return True
        
    except Exception as e:
        print(f"Error in raw command write: {e}")
        return False

def write_ntag_alternative_ndef(pn532, uid, uri):
    """Try alternative NDEF formats that might be accepted"""
    print("Attempting alternative NDEF format...")
    
    try:
        method = getattr(pn532, 'ntag2xx_write_block')
        
        # Format the tag first
        write_ntag_format_tag(pn532, uid)
        
        # Try a minimal NDEF format
        # Sometimes tags accept simpler formats better
        uri_bytes = uri.encode('utf-8')
        
        # Simple NDEF: just type and payload
        simple_ndef = bytes([
            0x03,  # NDEF message
            len(uri_bytes) + 5,  # Length
            0xD1,  # NDEF header
            0x01,  # Type length
            len(uri_bytes) + 1,  # Payload length  
            0x55,  # 'U' for URI
            0x00   # No URI prefix
        ]) + uri_bytes + bytes([0xFE])  # Terminator
        
        print(f"Simple NDEF ({len(simple_ndef)} bytes): {[hex(b) for b in simple_ndef[:20]]}...")
        
        # Write in 4-byte pages
        start_page = 4
        pages_needed = (len(simple_ndef) + 3) // 4
        
        for page_num in range(pages_needed):
            actual_page = start_page + page_num
            
            start_idx = page_num * 4
            end_idx = min(start_idx + 4, len(simple_ndef))
            
            page_data = []
            for i in range(start_idx, end_idx):
                page_data.append(simple_ndef[i])
            while len(page_data) < 4:
                page_data.append(0x00)
            
            print(f"Writing page {actual_page}: {[hex(b) for b in page_data]}")
            
            if page_num > 0:
                time.sleep(0.2)
            
            result = method(actual_page, page_data)
            if result:
                print(f"  ✅ Success")
            else:
                print(f"  ❌ Failed")
                return False
            
            if end_idx >= len(simple_ndef):
                break
        
        return True
        
    except Exception as e:
        print(f"Error in alternative NDEF write: {e}")
        return False

def write_ntag_clean_first(pn532, uid, ndef_data):
    """Write NDEF data after cleaning the tag first"""
    print("Attempting NTAG write with pre-cleaning...")
    
    try:
        method = getattr(pn532, 'ntag2xx_write_block')
        
        # First, clean pages 4-7 to reset any existing NDEF structure
        print("Step 1: Cleaning NDEF area...")
        clean_pages = [4, 5, 6, 7]
        empty_data = [0x00, 0x00, 0x00, 0x00]
        
        for page in clean_pages:
            try:
                result = method(page, empty_data)
                if result:
                    print(f"  Cleaned page {page}")
                else:
                    print(f"  Failed to clean page {page}")
            except Exception as e:
                print(f"  Error cleaning page {page}: {e}")
            time.sleep(0.1)  # Small delay between operations
        
        # Add a longer delay after cleaning
        print("  Waiting for tag to reset...")
        time.sleep(0.5)
        
        # Now write the NDEF data
        print("\nStep 2: Writing NDEF data...")
        start_page = 4
        pages_needed = (len(ndef_data) + 3) // 4
        
        for page_num in range(pages_needed):
            actual_page = start_page + page_num
            
            # Prepare data
            start_idx = page_num * 4
            end_idx = min(start_idx + 4, len(ndef_data))
            page_data = list(ndef_data[start_idx:end_idx])
            
            while len(page_data) < 4:
                page_data.append(0x00)
            
            print(f"Writing page {actual_page}: {[hex(b) for b in page_data]}")
            
            # Add delay between writes
            if page_num > 0:
                time.sleep(0.2)
            
            # Try to write
            max_attempts = 3
            success = False
            
            for attempt in range(max_attempts):
                if attempt > 0:
                    print(f"  Retry {attempt}/{max_attempts-1}...")
                    time.sleep(0.3)
                
                try:
                    # Check if tag is still present before writing
                    if attempt > 0:  # Only check on retries
                        test_uid = pn532.read_passive_target(timeout=0.5)
                        if not test_uid or list(test_uid) != list(uid):
                            print(f"  ⚠️  TAG REMOVED! Please keep tag in place during entire write process!")
                            return False
                    
                    result = method(actual_page, page_data)
                    if result:
                        print(f"  ✅ Success")
                        success = True
                        break
                    else:
                        print(f"  ❌ Write returned False")
                except Exception as e:
                    print(f"  ❌ Exception: {e}")
            
            if not success:
                return False
            
            if end_idx >= len(ndef_data):
                break
        
        return True
        
    except Exception as e:
        print(f"Error in clean-first write: {e}")
        return False

def write_ntag_byte_by_byte(pn532, uid, ndef_data):
    """Write NDEF using byte arrays instead of lists"""
    print("Attempting NTAG write with bytearray format...")
    
    try:
        method = getattr(pn532, 'ntag2xx_write_block')
        
        # Convert all data to bytearray format
        ndef_bytearray = bytearray(ndef_data)
        
        start_page = 4
        pages_needed = (len(ndef_bytearray) + 3) // 4
        
        print(f"Writing {len(ndef_bytearray)} bytes as bytearray...")
        
        for page_num in range(pages_needed):
            actual_page = start_page + page_num
            
            # Extract 4 bytes as bytearray
            start_idx = page_num * 4
            end_idx = min(start_idx + 4, len(ndef_bytearray))
            
            # Create bytearray for this page
            page_data = bytearray(4)
            for i in range(end_idx - start_idx):
                page_data[i] = ndef_bytearray[start_idx + i]
            
            print(f"Writing page {actual_page}: {[hex(b) for b in page_data]}")
            
            # Add delay
            if page_num > 0:
                time.sleep(0.2)
            
            try:
                # Try both bytearray and list formats
                result = method(actual_page, page_data)
                if not result:
                    # If bytearray fails, try as list
                    print(f"  Bytearray failed, trying list format...")
                    result = method(actual_page, list(page_data))
                
                if result:
                    print(f"  ✅ Success")
                else:
                    print(f"  ❌ Failed")
                    return False
                    
            except Exception as e:
                print(f"  ❌ Error: {e}")
                return False
            
            if end_idx >= len(ndef_bytearray):
                break
        
        return True
        
    except Exception as e:
        print(f"Error in bytearray write: {e}")
        return False

def write_ntag_manual_ndef(pn532, uid, uri):
    """Build and write NDEF manually with different structure"""
    print("Attempting manual NDEF construction...")
    
    try:
        method = getattr(pn532, 'ntag2xx_write_block')
        
        # Build NDEF message manually
        # URI payload: identifier byte + URI
        uri_bytes = uri.encode('utf-8')
        uri_payload = bytes([0x00]) + uri_bytes  # 0x00 = no URI abbreviation
        
        # NDEF record
        ndef_flags = 0xD1  # MB=1, ME=1, SR=1, TNF=0x01 (Well Known)
        type_length = 0x01
        payload_length = len(uri_payload)
        type_field = ord('U')
        
        # Build complete NDEF message
        ndef_message = bytes([
            ndef_flags,
            type_length,
            payload_length,
            type_field
        ]) + uri_payload
        
        # Wrap in TLV
        if len(ndef_message) < 255:
            ndef_data = bytes([0x03, len(ndef_message)]) + ndef_message + bytes([0xFE])
        else:
            # For larger messages
            ndef_data = bytes([0x03, 0xFF, 
                             (len(ndef_message) >> 8) & 0xFF,
                             len(ndef_message) & 0xFF]) + ndef_message + bytes([0xFE])
        
        print(f"NDEF data ({len(ndef_data)} bytes): {[hex(b) for b in ndef_data[:20]]}...")
        
        # Write data
        start_page = 4
        pages_needed = (len(ndef_data) + 3) // 4
        
        for page_num in range(pages_needed):
            actual_page = start_page + page_num
            
            start_idx = page_num * 4
            end_idx = min(start_idx + 4, len(ndef_data))
            
            # Extract page data
            page_data = []
            for i in range(start_idx, end_idx):
                page_data.append(ndef_data[i])
            while len(page_data) < 4:
                page_data.append(0x00)
            
            print(f"Writing page {actual_page}: {[hex(b) for b in page_data]}")
            
            if page_num > 0:
                time.sleep(0.2)
            
            try:
                result = method(actual_page, page_data)
                if result:
                    print(f"  ✅ Success")
                else:
                    print(f"  ❌ Failed")
                    return False
            except Exception as e:
                print(f"  ❌ Error: {e}")
                return False
            
            if end_idx >= len(ndef_data):
                break
        
        return True
        
    except Exception as e:
        print(f"Error in manual NDEF write: {e}")
        return False

def write_ntag_with_capability_reset(pn532, uid, ndef_data):
    """Reset capability container before writing NDEF"""
    print("Attempting write with capability container reset...")
    
    try:
        method = getattr(pn532, 'ntag2xx_write_block')
        
        # First, rewrite the capability container to ensure it's correct
        print("Step 1: Resetting capability container...")
        cc_data = [0xE1, 0x10, 0x12, 0x00]  # Standard NTAG213 CC
        
        result = method(3, cc_data)
        if result:
            print("  ✅ CC reset successful")
        else:
            print("  ⚠️  CC reset failed, continuing anyway...")
        
        time.sleep(0.5)
        
        # Now write NDEF data using the working method
        return write_ntag_clean_first(pn532, uid, ndef_data)
        
    except Exception as e:
        print(f"Error in CC reset write: {e}")
        return False

def write_ntag_simple_with_presence_check(pn532, uid, ndef_data):
    """Simple NTAG write with tag presence checking"""
    print("Writing NDEF data to NTAG...")
    print("📱 Keep tag in place for the entire process!\n")
    
    try:
        method = getattr(pn532, 'ntag2xx_write_block')
        
        start_page = 4
        pages_needed = (len(ndef_data) + 3) // 4
        total_pages = pages_needed
        
        print(f"Writing {pages_needed} pages...")
        
        for page_num in range(pages_needed):
            actual_page = start_page + page_num
            
            # Prepare page data
            start_idx = page_num * 4
            end_idx = min(start_idx + 4, len(ndef_data))
            page_data = list(ndef_data[start_idx:end_idx])
            
            while len(page_data) < 4:
                page_data.append(0x00)
            
            # Show progress
            progress = int((page_num / total_pages) * 20)
            progress_bar = "█" * progress + "░" * (20 - progress)
            print(f"\rWriting: [{progress_bar}] Page {actual_page}/{start_page + total_pages - 1}", end="")
            
            # Check tag presence every 5 pages
            if page_num > 0 and page_num % 5 == 0:
                test_uid = pn532.read_passive_target(timeout=0.5)
                if not test_uid or list(test_uid) != list(uid):
                    print(f"\n❌ TAG REMOVED! Please keep tag in place!")
                    return False
            
            result = method(actual_page, page_data)
            if not result:
                print(f"\n❌ Failed to write page {actual_page}")
                return False
            
            if end_idx >= len(ndef_data):
                break
            
            # Small delay between writes
            time.sleep(0.05)
        
        print(f"\rWriting: [████████████████████] Complete!    ")
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

# Update the main write_ntag function to use the simple approach first
def write_ntag(pn532, uid, ndef_data):
    """Write NDEF data to NTAG card"""
    # Since the issue was just keeping the tag in place, 
    # let's use the simple approach with presence checking
    return write_ntag_simple_with_presence_check(pn532, uid, ndef_data)

def write_ndef_message(pn532, ndef_message):
    """Write NDEF message to an NFC tag with auto-detection"""
    print("\nPlace NFC tag near reader to write data...")
    
    # Wait for a tag
    uid = pn532.read_passive_target(timeout=10)
    if not uid:
        print("No tag detected within timeout period.")
        return False
    
    print(f"Found tag UID: {[hex(i) for i in uid]}")
    print("\n⚠️  IMPORTANT: Keep the tag on the reader during the ENTIRE write process!")
    print("⚠️  This will take several seconds - DO NOT REMOVE THE TAG!\n")
    
    # Detect card type
    card_type = detect_card_type(uid)
    print(f"Detected card type: {card_type}")
    
    # Read NTAG info to understand memory layout
    if card_type == "NTAG":
        read_ntag_info(pn532, uid)
        
        # Check for write protection
        is_protected = check_write_protection(pn532, uid)
        
        # Test basic write functionality first
        print("\nTesting basic write capability...")
        basic_write_works = test_basic_write(pn532, uid)
        
        if not basic_write_works:
            print("⚠️  Basic write test failed! This indicates a fundamental issue.")
            print("Possible causes:")
            print("  - Tags are write-protected or locked")
            print("  - Library compatibility issues") 
            print("  - Hardware connection problems")
            print("  - These might be read-only tags")
            
            user_input = input("Continue anyway? (y/n): ").strip().lower()
            if user_input not in ['y', 'yes']:
                return False
        else:
            print("✅ Basic write test passed!")
            
            if is_protected:
                print("⚠️  However, write protection is detected. NDEF writes may still fail.")
        
        # Ask user if they want to clear existing data
        user_input = input("\nClear any existing data before writing? (y/n): ").strip().lower()
        if user_input in ['y', 'yes']:
            clear_ntag_data(pn532, uid)
            print("Clear operation completed.")
    
    # Add NDEF TLV format
    if len(ndef_message) < 255:
        ndef_data = bytes([0x03, len(ndef_message)]) + ndef_message + bytes([0xFE])
    else:
        ndef_data = bytes([0x03, 0xFF, len(ndef_message) >> 8, len(ndef_message) & 0xFF]) + ndef_message + bytes([0xFE])
    
    print(f"NDEF data length: {len(ndef_data)} bytes")
    print(f"NDEF data preview: {[hex(b) for b in ndef_data[:20]]}...")
    
    # Try different writing methods based on card type
    success = False
    
    if card_type == "NTAG":
        success = write_ntag(pn532, uid, ndef_data)
        if not success:
            print("NTAG write failed, trying MIFARE Classic method...")
            success = write_mifare_classic(pn532, uid, ndef_data)
    else:
        success = write_mifare_classic(pn532, uid, ndef_data)
        if not success and card_type == "UNKNOWN":
            print("MIFARE Classic write failed, trying NTAG method...")
            success = write_ntag(pn532, uid, ndef_data)
    
    if success:
        print("NDEF message written successfully!")
    else:
        print("All write methods failed.")
        print("\n⚠️  TROUBLESHOOTING TIPS:")
        print("1. **KEEP THE TAG ON THE READER** during the entire write process!")
        print("2. Make sure the tag is properly positioned on the reader")
        print("3. Try a different/new tag if this one might be damaged")
        print("4. Check that the tag isn't write-protected")
        print("5. Try holding the tag more firmly against the reader")
        print("\nMost failures are due to the tag being moved during writing!")
    
    return success

def main():
    """Main function to handle user input and write NFC tag"""
    print("NFC URI Writer with JSON Data")
    print("=" * 30)
    
    # Initialize PN532
    pn532 = setup_pn532()
    if not pn532:
        print("Failed to initialize PN532. Exiting.")
        return
    
    # Get UUID from user
    while True:
        uuid_input = input("Enter UUID value: ").strip()
        if uuid_input:
            break
        print("Please enter a valid UUID.")
    
    # Create the URI
    base_url = "https://tinyurl.com/ssntry"
    uri = f"{base_url}?embedded=true&&uuid={uuid_input}"
    
    # Create JSON data
    json_data = json.dumps({"uuid": uuid_input})
    
    print(f"\nPreparing to write:")
    print(f"  URI: {uri}")
    print(f"  JSON: {json_data}")
    print(f"  URI length: {len(uri)} characters")
    print(f"  JSON length: {len(json_data)} characters")
    
    # Create NDEF records
    uri_record = create_uri_record(uri)
    text_record = create_text_record(json_data)
    
    # Combine into multi-record NDEF message
    ndef_message = create_multi_record_ndef([uri_record, text_record])
    
    # Calculate total size needed
    total_size = len(ndef_message) + 4  # +4 for TLV wrapper
    print(f"\nTotal NDEF data size: {total_size} bytes")
    print(f"  URI record: {len(uri_record)} bytes")
    print(f"  Text record: {len(text_record)} bytes")
    
    # Check if data will fit on typical NTAG213
    max_ntag213_data = 144
    if total_size > max_ntag213_data:
        print(f"⚠️  Warning: Data size ({total_size} bytes) exceeds NTAG213 capacity ({max_ntag213_data} bytes)")
        print("This will fail on small NTAG213 stickers. Consider:")
        print("  - Using shorter UUIDs")
        print("  - Using a shorter base URL")
        print("  - Using larger NTAG215/216 chips")
        print("  - Storing only one record type")
        
        user_input = input("\nContinue anyway? (y/n): ").strip().lower()
        if user_input not in ['y', 'yes']:
            print("Aborted. Consider using NTAG215 or NTAG216 for more storage.")
            return
    else:
        print(f"✅ Data size OK for NTAG213 ({total_size}/{max_ntag213_data} bytes)")
    
    # Calculate pages needed
    pages_needed = (total_size + 3) // 4  # Round up
    last_page_needed = 4 + pages_needed - 1
    print(f"Will write to pages 4-{last_page_needed} ({pages_needed} pages total)")
    
    # Write to NFC tag
    success = write_ndef_message(pn532, ndef_message)
    
    if success:
        print("\n✅ NFC tag programmed successfully!")
        print(f"The tag now contains:")
        print(f"  - URI: {uri}")
        print(f"  - JSON: {json_data}")
        print("\n🎉 Great job keeping the tag in place! (Unlike some people we know... 😄)")
    else:
        print("\n❌ Failed to program NFC tag.")

if __name__ == "__main__":
    main()
