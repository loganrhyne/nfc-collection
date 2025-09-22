#!/bin/bash
# Fix nginx configuration conflicts

echo "Fixing nginx configuration..."

# Stop nginx
sudo systemctl stop nginx

# Remove ALL enabled sites (including default)
echo "Removing conflicting sites..."
sudo rm -f /etc/nginx/sites-enabled/*

# Make sure our config exists
if [ ! -f /etc/nginx/sites-available/nfc-collection.conf ]; then
    echo "Copying nfc-collection.conf..."
    sudo cp deployment/nginx/nfc-collection.conf /etc/nginx/sites-available/
fi

# Enable only our site
echo "Enabling nfc-collection site..."
sudo ln -sf /etc/nginx/sites-available/nfc-collection.conf /etc/nginx/sites-enabled/

# Test configuration
echo "Testing nginx configuration..."
if sudo nginx -t; then
    echo "✓ Configuration valid"

    # Start nginx
    if sudo systemctl start nginx; then
        echo "✓ Nginx started successfully"

        # Check it's actually running
        if sudo systemctl is-active nginx > /dev/null; then
            echo "✓ Nginx is running"
            echo ""
            echo "Nginx status:"
            sudo systemctl status nginx --no-pager | head -10
        fi
    else
        echo "✗ Failed to start nginx"
        echo ""
        echo "Error details:"
        sudo journalctl -xeu nginx -n 20 --no-pager
    fi
else
    echo "✗ Configuration test failed"
fi

echo ""
echo "Current sites enabled:"
ls -la /etc/nginx/sites-enabled/