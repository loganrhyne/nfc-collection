#!/bin/bash
# Media sync script for NFC Collection
# Run this from your non-dev machine to sync Day One exports to the Pi

# Configuration
SOURCE_BASE_DIR="$HOME/Public/Drop Box/Day One Exports"
PI_HOST="nfc-pi.local"  # Or use IP address
PI_USER="loganrhyne"
PI_MEDIA_DIR="/home/loganrhyne/nfc-media"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}NFC Collection - Media Sync${NC}"
echo "==============================="

# Find the most recent Day One export directory (date-based directories)
echo -e "\n${YELLOW}Finding most recent export...${NC}"
# Look for directories with date pattern (MM-DD-YYYY) or just get the most recent directory
LATEST_EXPORT=$(find "$SOURCE_BASE_DIR" -maxdepth 1 -type d ! -path "$SOURCE_BASE_DIR" | sort -r | head -n 1)

if [ -z "$LATEST_EXPORT" ]; then
    echo -e "${RED}Error: No Day One export directories found in $SOURCE_BASE_DIR${NC}"
    exit 1
fi

echo "Found: $(basename "$LATEST_EXPORT")"
echo "Path: $LATEST_EXPORT"

# Count files to sync
PHOTO_COUNT=$(find "$LATEST_EXPORT/photos" -type f 2>/dev/null | wc -l)
VIDEO_COUNT=$(find "$LATEST_EXPORT/videos" -type f 2>/dev/null | wc -l)
echo -e "\nFiles found:"
echo "  Photos: $PHOTO_COUNT"
echo "  Videos: $VIDEO_COUNT"
echo "  Journal: journal.json"

# Confirm before syncing
read -p "Sync these files to $PI_HOST? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Sync cancelled."
    exit 0
fi

# Create remote directories if they don't exist
echo -e "\n${YELLOW}Preparing remote directories...${NC}"
ssh "${PI_USER}@${PI_HOST}" "mkdir -p ${PI_MEDIA_DIR}/{photos,videos}"

# Sync photos (only new/changed files)
if [ -d "$LATEST_EXPORT/photos" ]; then
    echo -e "\n${YELLOW}Syncing photos...${NC}"
    rsync -avz --progress \
        --itemize-changes \
        "$LATEST_EXPORT/photos/" \
        "${PI_USER}@${PI_HOST}:${PI_MEDIA_DIR}/photos/"
fi

# Sync videos (only new/changed files)
if [ -d "$LATEST_EXPORT/videos" ]; then
    echo -e "\n${YELLOW}Syncing videos...${NC}"
    rsync -avz --progress \
        --itemize-changes \
        "$LATEST_EXPORT/videos/" \
        "${PI_USER}@${PI_HOST}:${PI_MEDIA_DIR}/videos/"
fi

# Sync journal.json
if [ -f "$LATEST_EXPORT/journal.json" ]; then
    echo -e "\n${YELLOW}Syncing journal.json...${NC}"
    rsync -avz --progress \
        "$LATEST_EXPORT/journal.json" \
        "${PI_USER}@${PI_HOST}:${PI_MEDIA_DIR}/"
fi

# Set proper permissions
echo -e "\n${YELLOW}Setting permissions...${NC}"
ssh "${PI_USER}@${PI_HOST}" "chmod -R 755 ${PI_MEDIA_DIR}"

# Show disk usage
echo -e "\n${YELLOW}Remote disk usage:${NC}"
ssh "${PI_USER}@${PI_HOST}" "du -sh ${PI_MEDIA_DIR}/*"

echo -e "\n${GREEN}✓ Media sync complete!${NC}"
echo "Media location on Pi: ${PI_MEDIA_DIR}"

# Optional: Show what changed
echo -e "\n${YELLOW}Summary of changes:${NC}"
echo "Check the rsync output above for:"
echo "  > = file sent (new or updated)"
echo "  < = file received (shouldn't happen)"
echo "  c = checksum differs"
echo "  s = size differs"
echo "  t = timestamp differs"