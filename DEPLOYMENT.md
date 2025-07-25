# Deployment Guide for NFC Sand Collection Dashboard

This guide explains how to deploy the dashboard application on a Raspberry Pi.

## Development vs. Production Approach

There are two main ways to run the dashboard on your Raspberry Pi:

### 1. Full Development Setup (Slower)

The full setup compiles the React app directly on the Pi, which is resource-intensive:

```bash
# Install dependencies and build on the Pi
./pi-setup.sh
cd dashboard-ui
npm start
```

### 2. Lightweight Deployment (Recommended)

The lightweight approach compiles the app on a more powerful machine and copies just the build files to the Pi:

#### On the Raspberry Pi:
```bash
# Install basic dependencies, Python environment, and nginx
./pi-setup-light.sh
```

#### On your development machine:
```bash
# Build the React application
cd dashboard-ui
npm install
npm run build
```

#### Copy the build to the Pi:
```bash
# Copy build files to the Pi (adjust hostname/IP as needed)
scp -r build/* pi@raspberrypi.local:~/nfc-collection/dashboard-ui-build/
```

The dashboard will be available at: http://raspberrypi.local

## Directory Structure

- `dashboard-ui/`: React application source code
- `dashboard-ui/build/`: Built application (not checked into Git)
- `dashboard-ui-build/`: Deployment directory on the Raspberry Pi (not checked into Git)
- `venv/`: Python virtual environment for NFC scripts (not checked into Git)
- `collection_data/`: Directory for media files (outside the repo)

## File Management

- **Source code** is checked into Git
- **Build artifacts** are NOT checked into Git
- The `.gitignore` file is configured to exclude:
  - `dashboard-ui/build/`
  - `dashboard-ui/node_modules/`
  - `dashboard-ui-build/`
  - `collection_data/`
  - `venv/`

## Auto-Starting on Boot

To make the dashboard start automatically on boot:

1. For the lightweight approach (recommended), nginx will already auto-start.

2. For the full development setup, create a systemd service:

```bash
sudo nano /etc/systemd/system/nfc-dashboard.service
```

Add the following content:
```
[Unit]
Description=NFC Collection Dashboard
After=network.target

[Service]
WorkingDirectory=/home/pi/nfc-collection/dashboard-ui
ExecStart=/usr/bin/npm start
Restart=always
User=pi
Environment=DISPLAY=:0

[Install]
WantedBy=multi-user.target
```

Then enable and start the service:
```bash
sudo systemctl enable nfc-dashboard
sudo systemctl start nfc-dashboard
```

## Running NFC Scripts

The `run-nfc-test.sh` script handles running NFC testing scripts within the virtual environment:

```bash
# Run the simple NFC reader
./run-nfc-test.sh 1

# Run the basic PN532 test
./run-nfc-test.sh 2

# Run the write entry to NFC tag script
./run-nfc-test.sh 3
```