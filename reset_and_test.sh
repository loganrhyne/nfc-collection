#!/bin/bash
# Reset GPIO and test NFC

echo "============================================"
echo "GPIO Reset and NFC Test"
echo "============================================"

echo -e "\n🛑 Stopping any NFC services..."
sudo systemctl stop nfc-websocket 2>/dev/null
sudo systemctl stop nfc-dashboard 2>/dev/null

echo -e "\n🔄 Killing any Python processes using server.py..."
sudo pkill -f 'python.*server.py'
sleep 2

echo -e "\n🧹 Cleaning up GPIO exports..."
for pin in 25 8 7; do
    if [ -d "/sys/class/gpio/gpio$pin" ]; then
        echo "Unexporting GPIO $pin"
        echo $pin | sudo tee /sys/class/gpio/unexport
    fi
done

echo -e "\n⏳ Waiting for GPIOs to release..."
sleep 2

echo -e "\n📡 Now testing NFC modes..."
echo "============================================"
~/nfc-collection/python-services/venv/bin/python ~/nfc-collection/test_both_modes.py

echo -e "\n============================================"
echo "If a mode worked above, start the server with:"
echo "  cd ~/nfc-collection/python-services"
echo "  source venv/bin/activate"
echo "  python server.py"
echo "============================================"