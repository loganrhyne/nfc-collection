#!/bin/bash
# NFC Server Debug Script for Raspberry Pi

echo "=========================================="
echo "NFC Collection Server Debug"
echo "=========================================="

# Check Python server process
echo -e "\n📊 Checking for running Python server:"
ps aux | grep -E "python.*server.py|python.*nfc" | grep -v grep

# Check which port is being used
echo -e "\n🔌 Checking port 8765 (WebSocket server):"
sudo netstat -tlnp | grep 8765 || sudo ss -tlnp | grep 8765

# Check systemd service if exists
echo -e "\n🔧 Checking systemd service:"
sudo systemctl status nfc-server 2>/dev/null || echo "No systemd service found"

# Check for screen/tmux sessions
echo -e "\n📺 Checking screen sessions:"
screen -ls 2>/dev/null || echo "No screen sessions"

echo -e "\n📺 Checking tmux sessions:"
tmux ls 2>/dev/null || echo "No tmux sessions"

# Recent logs from common locations
echo -e "\n📝 Recent logs (if any):"
if [ -f /var/log/nfc-server.log ]; then
    echo "From /var/log/nfc-server.log:"
    tail -20 /var/log/nfc-server.log
fi

if [ -f ~/nfc-collection/python-services/server.log ]; then
    echo "From ~/nfc-collection/python-services/server.log:"
    tail -20 ~/nfc-collection/python-services/server.log
fi

# Check journalctl
echo -e "\n📋 Recent journal entries:"
sudo journalctl -u nfc-server --no-pager -n 20 2>/dev/null || echo "No journal entries for nfc-server"

echo -e "\n=========================================="
echo "To see live logs, try one of these:"
echo "  1. sudo journalctl -u nfc-server -f"
echo "  2. screen -r (if using screen)"
echo "  3. tmux attach (if using tmux)"
echo "  4. tail -f /path/to/logfile"
echo ""
echo "To restart the server manually:"
echo "  cd ~/nfc-collection/python-services"
echo "  python3 server.py"
echo "=========================================="