#!/bin/bash
#
# Initial setup script for Raspberry Pi
# Run this once to install all dependencies
#

set -e

echo "============================================"
echo "NFC Collection - Raspberry Pi Setup"
echo "============================================"

# Update system
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install system dependencies
echo "Installing system dependencies..."
sudo apt-get install -y \
    python3-pip \
    python3-venv \
    python3-dev \
    nginx \
    git \
    i2c-tools \
    build-essential

# Enable SPI and I2C
echo "Enabling hardware interfaces..."
sudo raspi-config nonint do_spi 0
sudo raspi-config nonint do_i2c 0

# Add user to required groups
echo "Setting up user permissions..."
sudo usermod -a -G gpio,spi,i2c,www-data $USER

# Clone repository if needed
if [ ! -d "$HOME/nfc-collection" ]; then
    echo "Cloning repository..."
    git clone https://github.com/yourusername/nfc-collection.git $HOME/nfc-collection
fi

cd $HOME/nfc-collection

# Setup Python virtual environment
echo "Setting up Python environment..."
cd python-services
python3 -m venv venv
source venv/bin/activate

# Install Python packages
pip install --upgrade pip
pip install wheel
pip install -r requirements.txt

# Install hardware-specific packages
pip install \
    adafruit-blinka \
    adafruit-circuitpython-pn532 \
    adafruit-circuitpython-neopixel \
    adafruit-circuitpython-busdevice

deactivate
cd ..

# Create media directory
echo "Creating media directory..."
mkdir -p $HOME/nfc-media/{photos,videos}

# Setup systemd services
echo "Installing systemd services..."
sudo cp deployment/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload

# Setup nginx
echo "Configuring nginx..."
sudo cp deployment/nginx/nfc-collection.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/nfc-collection.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Create required directories
mkdir -p dashboard-ui/build

echo ""
echo "============================================"
echo "Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Reboot to ensure all permissions take effect:"
echo "   sudo reboot"
echo ""
echo "2. After reboot, deploy the application:"
echo "   ./deploy-clean.sh"
echo ""
echo "3. Check service status:"
echo "   sudo systemctl status nfc-hardware"
echo "   sudo systemctl status nfc-websocket"
echo "   sudo systemctl status nginx"
echo "============================================"