#!/bin/bash
# Installation script for setting up the NFC Collection dashboard on Raspberry Pi

echo "Installing Node.js and npm..."
# Add Node.js repository and install Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install required system packages
echo "Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y python3-pip git build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# Install Python packages for NFC
echo "Installing Python NFC libraries..."
pip3 install adafruit-circuitpython-pn532 rpi_ws281x adafruit-circuitpython-neopixel

# Set up the dashboard UI
echo "Setting up dashboard UI..."
cd dashboard-ui
npm install

echo "Setup complete! You can now run the dashboard with: npm start"
echo "To make it run on boot, add it to your startup scripts"