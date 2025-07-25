import board
import busio
from digitalio import DigitalInOut
from adafruit_pn532.spi import PN532_SPI

# Configure SPI bus
spi = busio.SPI(board.SCK, board.MOSI, board.MISO)

# Chip Select on GPIO25
cs_pin = DigitalInOut(board.D25)
pn532 = PN532_SPI(spi, cs_pin, debug=False)

# Check PN532 firmware version
ic, ver, rev, support = pn532.firmware_version
print(f"PN532 Firmware Version: {ver}.{rev}")

# Configure PN532 to read RFID tags
pn532.SAM_configuration()

# Attempt to read an NFC tag
print("Place NFC tag near reader...")
uid = pn532.read_passive_target(timeout=5)

if uid:
    print("Found tag UID:", [hex(i) for i in uid])
else:
    print("No tag detected.")

