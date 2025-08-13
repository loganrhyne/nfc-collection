#!/bin/bash
# Lightweight installation script for Raspberry Pi
# This script uses a pre-built version of the app instead of compiling on the Pi

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
mkdir -p dashboard-ui-build

# Create a simple static HTML page to display until the full build is deployed
cat > dashboard-ui-build/index.html << EOL
<!DOCTYPE html>
<html>
<head>
  <title>NFC Sand Collection Dashboard</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 100vh; 
      margin: 0; 
      background-color: #f5f5f5; 
    }
    .message { 
      text-align: center; 
      padding: 20px; 
      background: white; 
      border-radius: 8px; 
      box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
    }
    h1 { color: #333; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="message">
    <h1>NFC Sand Collection Dashboard</h1>
    <p>Build and deploy the React app to see the dashboard.</p>
    <p>On your development machine run:</p>
    <pre>cd dashboard-ui && npm run build</pre>
    <p>Then copy the build folder to the Raspberry Pi.</p>
  </div>
</body>
</html>
EOL

# Configure nginx to serve the static site
echo "Configuring nginx..."
cat > /tmp/nfc-dashboard.conf << EOL
server {
    listen 80 default_server;
    server_name _;

    root /home/$(whoami)/nfc-collection/dashboard-ui-build;
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
echo "Lightweight setup complete!"
echo ""
echo "To serve the dashboard:"
echo "1. On your development machine, build the React app:"
echo "   cd dashboard-ui && npm run build"
echo ""
echo "2. Copy the build directory to your Raspberry Pi:"
echo "   scp -r build/* pi@raspberrypi.local:~/nfc-collection/dashboard-ui-build/"
echo ""
echo "3. The dashboard will be available at http://raspberrypi.local"
echo ""
echo "To run NFC scripts: ./run-nfc-test.sh 1"