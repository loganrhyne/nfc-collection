#!/bin/bash
# Fix port 80 conflicts

echo "============================================"
echo "Fixing Port 80 Conflict"
echo "============================================"

echo -e "\n1. Checking what's using port 80..."
sudo lsof -i:80

echo -e "\n2. Stopping potential conflicting services..."

# Stop old dashboard service if it exists
if systemctl is-active --quiet nfc-dashboard; then
    echo "Stopping nfc-dashboard service..."
    sudo systemctl stop nfc-dashboard
    sudo systemctl disable nfc-dashboard
fi

# Kill any Python processes on port 80
echo "Killing any Python processes on port 80..."
sudo fuser -k 80/tcp 2>/dev/null || true

# Stop apache2 if installed
if systemctl is-active --quiet apache2; then
    echo "Stopping apache2..."
    sudo systemctl stop apache2
    sudo systemctl disable apache2
fi

# Stop any other nginx instances
sudo pkill nginx 2>/dev/null || true

sleep 2

echo -e "\n3. Checking if port 80 is free now..."
if sudo lsof -i:80 2>/dev/null; then
    echo "⚠️  Port 80 is still in use by:"
    sudo lsof -i:80

    echo -e "\n4. Force killing anything on port 80..."
    sudo fuser -k 80/tcp 2>/dev/null || true
    sleep 2
else
    echo "✓ Port 80 is free"
fi

echo -e "\n5. Starting nginx..."
# Make sure nginx is completely stopped first
sudo systemctl stop nginx 2>/dev/null || true
sudo pkill -9 nginx 2>/dev/null || true
sleep 1

# Now start nginx
if sudo systemctl start nginx; then
    echo "✓ Nginx started successfully"

    echo -e "\n6. Verifying nginx is running..."
    sudo systemctl status nginx --no-pager | head -10

    echo -e "\n7. Testing web server..."
    if curl -s http://localhost/ > /dev/null 2>&1; then
        echo "✓ Web server is responding"
    else
        echo "⚠️  Web server not responding on port 80"
    fi
else
    echo "✗ Failed to start nginx"
    echo ""
    echo "Checking for errors..."
    sudo journalctl -xeu nginx -n 20 --no-pager
fi

echo -e "\n============================================"
echo "Current status:"
echo "Port 80 usage:"
sudo lsof -i:80 2>/dev/null || echo "Nothing on port 80"
echo ""
echo "Nginx status:"
sudo systemctl is-active nginx || echo "nginx not running"
echo "============================================"