#!/bin/bash
# Check auto-start configuration for NFC Collection services

echo "=== Auto-Start Configuration Check ==="
echo ""

# Check nfc-server
echo "NFC Server Service:"
if systemctl is-enabled nfc-server > /dev/null 2>&1; then
    echo "  ✓ nfc-server is enabled for auto-start"
else
    echo "  ✗ nfc-server is NOT enabled for auto-start"
    echo "    Run: sudo systemctl enable nfc-server"
fi

# Check status
if systemctl is-active --quiet nfc-server; then
    echo "  ✓ nfc-server is currently running"
else
    echo "  ✗ nfc-server is NOT running"
fi

echo ""

# Check nginx
echo "Nginx Service:"
if systemctl is-enabled nginx > /dev/null 2>&1; then
    echo "  ✓ nginx is enabled for auto-start"
else
    echo "  ✗ nginx is NOT enabled for auto-start"
    echo "    Run: sudo systemctl enable nginx"
fi

# Check status
if systemctl is-active --quiet nginx; then
    echo "  ✓ nginx is currently running"
else
    echo "  ✗ nginx is NOT running"
fi

echo ""

# Check systemd service file
echo "Service Configuration:"
if [ -f /etc/systemd/system/nfc-server.service ]; then
    echo "  ✓ nfc-server.service file exists"

    # Check if it has WantedBy directive
    if grep -q "WantedBy=multi-user.target" /etc/systemd/system/nfc-server.service; then
        echo "  ✓ Service configured to start at boot (multi-user.target)"
    else
        echo "  ✗ Service missing WantedBy directive"
    fi

    # Check restart policy
    if grep -q "Restart=always" /etc/systemd/system/nfc-server.service; then
        echo "  ✓ Service will auto-restart on failure"
    else
        echo "  ⚠ Service won't auto-restart on failure"
    fi
else
    echo "  ✗ nfc-server.service file not found"
    echo "    Run: ./setup-pi.sh to install"
fi

echo ""

# Check dependencies
echo "Boot Dependencies:"
if grep -q "After=network.target" /etc/systemd/system/nfc-server.service 2>/dev/null; then
    echo "  ✓ Service waits for network before starting"
else
    echo "  ⚠ Service may start before network is ready"
fi

echo ""
echo "=== Summary ==="
echo "To enable auto-start for all services, run:"
echo "  sudo systemctl enable nfc-server"
echo "  sudo systemctl enable nginx"
echo ""
echo "To test auto-start without rebooting:"
echo "  sudo systemctl start nfc-server"
echo "  sudo systemctl start nginx"
echo ""
echo "To check logs after reboot:"
echo "  sudo journalctl -u nfc-server -b"
echo "  sudo journalctl -u nginx -b"