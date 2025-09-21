#!/bin/bash
# Diagnose why systemd services are failing

echo "============================================"
echo "NFC Collection Service Diagnostics"
echo "============================================"

echo -e "\n📊 Service Status:"
echo "-------------------"
sudo systemctl status nfc-websocket --no-pager | head -20
echo ""
sudo systemctl status nfc-dashboard --no-pager | head -20

echo -e "\n📝 Recent Service Logs:"
echo "------------------------"
echo "NFC WebSocket logs:"
sudo journalctl -u nfc-websocket -n 20 --no-pager
echo ""
echo "NFC Dashboard logs:"
sudo journalctl -u nfc-dashboard -n 20 --no-pager

echo -e "\n🔍 Checking file permissions:"
echo "------------------------------"
ls -la ~/nfc-collection/python-services/server.py
ls -la ~/nfc-collection/python-services/venv/bin/python
ls -la ~/nfc-collection/deployment/serve-spa.py
ls -la ~/nfc-collection/dashboard-ui/build/index.html

echo -e "\n🐍 Checking Python paths:"
echo "-------------------------"
echo "System Python3: $(which python3)"
echo "Venv Python: ~/nfc-collection/python-services/venv/bin/python"
if [ -f ~/nfc-collection/python-services/venv/bin/python ]; then
    echo "Venv exists ✓"
else
    echo "Venv missing ✗"
fi

echo -e "\n🌐 Checking port availability:"
echo "-------------------------------"
echo "Port 80 (web):"
sudo lsof -i:80
echo ""
echo "Port 8000 (websocket):"
sudo lsof -i:8000

echo -e "\n💡 Checking GPIO access:"
echo "------------------------"
groups loganrhyne | grep -q gpio && echo "User in gpio group ✓" || echo "User NOT in gpio group ✗"

echo -e "\n============================================"
echo "To manually test the services:"
echo "============================================"
echo "1. Test WebSocket server directly:"
echo "   cd ~/nfc-collection/python-services"
echo "   source venv/bin/activate"
echo "   python server.py"
echo ""
echo "2. Test web server directly:"
echo "   cd ~/nfc-collection/dashboard-ui"
echo "   sudo python3 ~/nfc-collection/deployment/serve-spa.py 80"
echo ""
echo "3. Or use the manual starter:"
echo "   ./start_services_manual.sh"
echo "============================================"