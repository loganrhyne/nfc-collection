#!/bin/bash
# Installation script for setting up the NFC Collection dashboard on Raspberry Pi

echo "Installing Node.js and npm..."
# Add Node.js repository and install Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install required system packages
echo "Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv git build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# Create Python virtual environment if it doesn't exist
echo "Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate the virtual environment and install packages
echo "Installing Python NFC libraries in virtual environment..."
source venv/bin/activate
pip install --upgrade pip
pip install adafruit-circuitpython-pn532 rpi_ws281x adafruit-circuitpython-neopixel
deactivate

# Set up the dashboard UI
echo "Setting up dashboard UI..."
cd dashboard-ui

# Increase Node.js memory limit to avoid memory issues on Raspberry Pi
echo "Using increased memory limit for npm install (Raspberry Pi optimization)"
export NODE_OPTIONS=--max_old_space_size=512

# Use production flag to skip dev dependencies and use the --no-optional flag to skip optional dependencies
echo "Running npm install with Raspberry Pi optimizations (this may take a while)..."
npm install --no-optional --verbose

echo "Setup complete!"
echo "To run the dashboard: cd dashboard-ui && npm start"
echo "To run Python scripts: source venv/bin/activate && python testing-scripts/simple-reader.py"
echo ""
echo "For auto-start on boot, create a systemd service file"