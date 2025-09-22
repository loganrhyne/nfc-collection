#!/bin/bash
# Setup nginx configuration with proper user paths

set -e

echo "Setting up nginx configuration..."

# Create nginx config with current user
NGINX_CONF="/tmp/nfc-collection.conf"
sed "s/\$USER/$USER/g" ~/nfc-collection/deployment/nginx/nfc-collection.conf > "$NGINX_CONF"

# Remove any existing configs
sudo rm -f /etc/nginx/sites-enabled/*

# Install the new config
sudo cp "$NGINX_CONF" /etc/nginx/sites-available/nfc-collection.conf
sudo ln -sf /etc/nginx/sites-available/nfc-collection.conf /etc/nginx/sites-enabled/

# Test nginx configuration
if sudo nginx -t; then
    echo "✓ Nginx configuration is valid"
    sudo systemctl reload nginx
    echo "✓ Nginx reloaded"
else
    echo "✗ Nginx configuration error!"
    exit 1
fi

rm "$NGINX_CONF"
echo "Nginx setup complete!"