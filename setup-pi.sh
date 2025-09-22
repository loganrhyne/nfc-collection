#!/bin/bash
# Initial Pi setup for NFC Collection

set -e

echo "=== NFC Collection Setup ==="

# Install dependencies
echo "Installing system packages..."
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv nginx git i2c-tools

# Enable hardware interfaces
echo "Enabling SPI and I2C..."
sudo raspi-config nonint do_spi 0
sudo raspi-config nonint do_i2c 0

# Add user to groups
sudo usermod -a -G gpio,spi,i2c,www-data $USER

# Setup Python environment
echo "Setting up Python environment..."
cd ~/nfc-collection/python-services
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Hardware-specific packages
pip install adafruit-blinka adafruit-circuitpython-pn532

deactivate

# Install nginx config
echo "Setting up nginx..."
sudo rm -f /etc/nginx/sites-enabled/*
sudo cp ~/nfc-collection/deployment/nginx/nfc-collection.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/nfc-collection.conf /etc/nginx/sites-enabled/
sudo systemctl restart nginx

# Install systemd service
echo "Installing service..."
sudo cp ~/nfc-collection/deployment/systemd/nfc-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nfc-server

# Create media directory
mkdir -p ~/nfc-media/{photos,videos}

echo ""
echo "=== Setup Complete ==="
echo "Reboot recommended: sudo reboot"
echo "Then deploy with: ./deploy.sh"