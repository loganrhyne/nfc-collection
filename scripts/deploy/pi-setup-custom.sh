#!/bin/bash
# Custom installation script for setting up the NFC Collection dashboard on Raspberry Pi
# This version targets the ~/Projects/nfc-collection directory structure

# Get the actual path to the project
PROJECT_DIR="$HOME/Projects/nfc-collection"
echo "Setting up for project directory: $PROJECT_DIR"

echo "Installing Node.js and npm..."
# Add Node.js repository and install Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install required system packages
echo "Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv git nginx

# Create Python virtual environment if it doesn't exist
echo "Setting up Python virtual environment..."
cd "$PROJECT_DIR"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate the virtual environment and install packages
echo "Installing Python NFC libraries in virtual environment..."
source venv/bin/activate
pip install --upgrade pip
pip install adafruit-circuitpython-pn532 rpi_ws281x adafruit-circuitpython-neopixel
deactivate

# Set up a static build directory
echo "Setting up static build directory..."
mkdir -p "$PROJECT_DIR/dashboard-ui-build"

# Configure nginx to serve the static site
echo "Configuring nginx..."
cat > /tmp/nfc-dashboard.conf << EOL
server {
    listen 80 default_server;
    server_name _;

    root $PROJECT_DIR/dashboard-ui-build;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOL

# Install nginx config
sudo cp /tmp/nfc-dashboard.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/nfc-dashboard.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Restart nginx
sudo systemctl restart nginx

echo ""
echo "Setup complete! The dashboard is now available at http://raspberrypi.local"
echo ""
echo "If there are any issues:"
echo "- Check nginx status with: sudo systemctl status nginx"
echo "- Check logs with: sudo journalctl -u nginx"
echo "- Test configuration with: sudo nginx -t"
echo ""
echo "To run NFC scripts, create run-nfc-test.sh in your Projects/nfc-collection directory"