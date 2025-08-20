#!/bin/bash

# Build script that injects version information
# Usage: ./build-with-version.sh [version]

# Get version from argument or use timestamp
VERSION=${1:-$(date +%Y%m%d-%H%M%S)}
BUILD_TIME=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

# Get git info (if available)
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

echo "Building nfc-collection dashboard..."
echo "Version: $VERSION"
echo "Build Time: $BUILD_TIME"
echo "Git Commit: $GIT_COMMIT"
echo "Git Branch: $GIT_BRANCH"

# Set environment variables for the build
export REACT_APP_VERSION="$VERSION"
export REACT_APP_BUILD_TIME="$BUILD_TIME"
export REACT_APP_GIT_COMMIT="$GIT_COMMIT"
export REACT_APP_GIT_BRANCH="$GIT_BRANCH"

# Run the build
npm run build

# Create a version file in the build directory
cat > build/version.json << EOF
{
  "version": "$VERSION",
  "buildTime": "$BUILD_TIME",
  "gitCommit": "$GIT_COMMIT",
  "gitBranch": "$GIT_BRANCH"
}
EOF

echo "Build complete! Version info saved to build/version.json"