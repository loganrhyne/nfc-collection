#!/bin/bash

# Start script that sets version information
# Usage: ./start-with-version.sh [version]

# Get version from argument or use timestamp
VERSION=${1:-$(date +%Y%m%d-%H%M%S)}
BUILD_TIME=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

echo "Starting NFC Collection Server..."
echo "Version: $VERSION"
echo "Build Time: $BUILD_TIME"

# Set environment variables
export SERVER_VERSION="$VERSION"
export SERVER_BUILD_TIME="$BUILD_TIME"

# Start the server
python3 server.py