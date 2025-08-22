# Deployment Version Tracking Guide

## Overview
This guide explains how to build and deploy the NFC Collection app with version tracking to ensure you know exactly what version is running on the Pi.

## Building the React App with Version

### Method 1: Automatic Timestamp Version
```bash
cd dashboard-ui
./build-with-version.sh
```
This creates a build with version like: `20240819-143022`

### Method 2: Custom Version
```bash
cd dashboard-ui
./build-with-version.sh "v1.2.3-touchfix"
```

### What It Does:
1. Sets environment variables with version info
2. Runs `npm run build`
3. Creates `build/version.json` with build metadata
4. Version appears in bottom-left corner of UI

## Deploying to Pi

```bash
# From your dev machine
cd dashboard-ui
./build-with-version.sh "v1.2.3"
rsync -avz --delete build/ pi@raspberrypi.local:/home/pi/nfc-collection/dashboard-ui/build/
```

## Starting the Python Server with Version

### On the Pi:
```bash
cd /home/pi/nfc-collection/python-services
./start-with-version.sh "v1.2.3"
```

Or with systemd:
```bash
# Edit the service file to include version
sudo nano /etc/systemd/system/nfc-server.service

# Add these environment variables:
Environment="SERVER_VERSION=v1.2.3"
Environment="SERVER_BUILD_TIME=2024-08-19 14:30:00 UTC"

# Restart service
sudo systemctl restart nfc-server
```

## Verifying Deployment

### 1. Check UI Version
- Look at bottom-left corner of dashboard
- Click version button to see full build info
- Check browser console for: `🚀 NFC Collection Dashboard Build Info:`

### 2. Check Server Version
- Look at server logs on startup:
```
============================================================
NFC Collection Server v1.2.3
Build Time: 2024-08-19 14:30:00 UTC
Start Time: 2024-08-19T14:35:00.123456
============================================================
```

- Check browser console for: `🚀 Server Build Info:`

### 3. WebSocket Connection
When the app connects, both versions are logged:
```
Connection status: {
  build_info: {
    server_version: "v1.2.3",
    build_time: "2024-08-19 14:30:00 UTC",
    ...
  }
}
```

## Quick Deployment Script

Create this as `deploy.sh` on your dev machine:

```bash
#!/bin/bash
VERSION=${1:-$(date +%Y%m%d-%H%M%S)}

echo "Deploying version: $VERSION"

# Build React app
cd dashboard-ui
./build-with-version.sh "$VERSION"

# Deploy to Pi
rsync -avz --delete build/ pi@raspberrypi.local:/home/pi/nfc-collection/dashboard-ui/build/

# Update server version on Pi
ssh pi@raspberrypi.local "echo 'export SERVER_VERSION=$VERSION' > /home/pi/nfc-collection/python-services/.env"
ssh pi@raspberrypi.local "sudo systemctl restart nfc-server"

echo "Deployment complete! Version $VERSION is now running."
```

## Troubleshooting Version Mismatches

If you see old UI behavior after deployment:

1. **Check browser cache**: Hard refresh (Ctrl+Shift+R)
2. **Verify build files**: Check modification time of files on Pi
3. **Compare versions**: UI version vs expected version
4. **Check rsync output**: Ensure files were actually transferred
5. **Verify service restart**: Check server logs show new version

## Version Naming Suggestions

- Production releases: `v1.0.0`, `v1.1.0`
- Feature branches: `v1.1.0-touchfix`, `v1.1.0-qrcode`
- Development builds: `dev-20240819-1430`
- Hotfixes: `v1.0.1-hotfix1`