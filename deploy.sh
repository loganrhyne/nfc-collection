#!/bin/bash
# Deployment script for the NFC Collection Dashboard

# Build the React app
cd dashboard-ui
npm run build

# Deploy to Raspberry Pi
echo "Deploying build to Raspberry Pi..."
scp -r build/* loganrhyne@raspberrypi.local:~/nfc-collection/dashboard-ui-build/

echo "Deployment complete!"
echo "Dashboard available at: http://raspberrypi.local/"