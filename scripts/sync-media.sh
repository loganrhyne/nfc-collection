#!/bin/bash
# Media sync script for NFC Collection
# Run this from your non-dev machine to sync Day One exports to the Pi

# Fail loudly: this script replaces the journal the display reads and the
# registration flow writes onto physical tags, so partial success is worse
# than no success.
set -euo pipefail

# Configuration
SOURCE_BASE_DIR="$HOME/Public/Drop Box/Day One Exports"
PI_HOST="192.168.1.114"  # Or use nfc-pi.local if DNS works
PI_USER="loganrhyne"
PI_MEDIA_DIR="/home/loganrhyne/nfc-media"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}NFC Collection - Media Sync${NC}"
echo "==============================="

# Find the most recent Day One export directory by modification time
echo -e "\n${YELLOW}Finding most recent export...${NC}"
# Get the most recently modified directory (using stat to get modification time)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS version (uses different stat syntax)
    LATEST_EXPORT=$(find "$SOURCE_BASE_DIR" -maxdepth 1 -type d ! -path "$SOURCE_BASE_DIR" -exec stat -f "%m %N" {} \; | sort -rn | head -n 1 | cut -d' ' -f2-)
else
    # Linux version
    LATEST_EXPORT=$(find "$SOURCE_BASE_DIR" -maxdepth 1 -type d ! -path "$SOURCE_BASE_DIR" -exec stat -c "%Y %n" {} \; | sort -rn | head -n 1 | cut -d' ' -f2-)
fi

if [ -z "$LATEST_EXPORT" ]; then
    echo -e "${RED}Error: No Day One export directories found in $SOURCE_BASE_DIR${NC}"
    exit 1
fi

echo "Found: $(basename "$LATEST_EXPORT")"
echo "Path: $LATEST_EXPORT"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Modified: $(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$LATEST_EXPORT")"
else
    echo "Modified: $(stat -c "%y" "$LATEST_EXPORT" | cut -d' ' -f1,2)"
fi

# Count files to sync
PHOTO_COUNT=$(find "$LATEST_EXPORT/photos" -type f 2>/dev/null | wc -l)
VIDEO_COUNT=$(find "$LATEST_EXPORT/videos" -type f 2>/dev/null | wc -l)
echo -e "\nFiles found:"
echo "  Photos: $PHOTO_COUNT"
echo "  Videos: $VIDEO_COUNT"
echo "  Journal: journal.json"

# Validate the export before anything is copied. The journal is served
# directly to the dashboard and its coordinates are written onto NFC tags, so
# a partial or malformed export is expensive to undo.
echo -e "\n${YELLOW}Validating export...${NC}"

JOURNAL_SRC=""
for candidate in "Sand Collection.json" "Journal.json" "journal.json"; do
    if [ -f "$LATEST_EXPORT/$candidate" ]; then
        JOURNAL_SRC="$LATEST_EXPORT/$candidate"
        break
    fi
done

if [ -z "$JOURNAL_SRC" ]; then
    echo -e "${RED}Error: no journal JSON found in the export${NC}"
    echo "Expected one of: 'Sand Collection.json', 'Journal.json', 'journal.json'"
    exit 1
fi

# Compare against what is actually deployed, so a partial export cannot
# silently replace a complete one.
# -n is essential: without it ssh reads stdin and swallows the y/N answer
# below, silently cancelling the sync.
BASELINE_COUNT=$(ssh -n "${PI_USER}@${PI_HOST}" \
    "python3 -c \"import json;print(len(json.load(open('${PI_MEDIA_DIR}/journal.json')).get('entries',[])))\" 2>/dev/null" \
    || echo "")

VALIDATE_ARGS=("$JOURNAL_SRC" "--media-dir" "$LATEST_EXPORT")
if [ -n "$BASELINE_COUNT" ]; then
    VALIDATE_ARGS+=("--baseline-count" "$BASELINE_COUNT")
else
    echo -e "${YELLOW}(could not read deployed entry count - skipping shrink check)${NC}"
fi

if ! python3 "$(dirname "$0")/validate-journal.py" "${VALIDATE_ARGS[@]}"; then
    echo -e "\n${RED}Export failed validation. Nothing was copied.${NC}"
    exit 1
fi

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

# Sync journal.json - Day One exports as "Sand Collection.json"
echo -e "\n${YELLOW}Checking for journal JSON file...${NC}"
if [ -f "$LATEST_EXPORT/Sand Collection.json" ]; then
    echo "Found: Sand Collection.json"
    echo -e "${YELLOW}Syncing as journal.json...${NC}"
    rsync -avz --progress \
        --itemize-changes \
        --checksum \
        "$LATEST_EXPORT/Sand Collection.json" \
        "${PI_USER}@${PI_HOST}:${PI_MEDIA_DIR}/journal.json"
elif [ -f "$LATEST_EXPORT/Journal.json" ]; then
    echo "Found: Journal.json"
    echo -e "${YELLOW}Syncing as journal.json...${NC}"
    rsync -avz --progress \
        --itemize-changes \
        --checksum \
        "$LATEST_EXPORT/Journal.json" \
        "${PI_USER}@${PI_HOST}:${PI_MEDIA_DIR}/journal.json"
elif [ -f "$LATEST_EXPORT/journal.json" ]; then
    echo "Found: journal.json"
    echo -e "${YELLOW}Syncing journal.json...${NC}"
    rsync -avz --progress \
        --itemize-changes \
        --checksum \
        "$LATEST_EXPORT/journal.json" \
        "${PI_USER}@${PI_HOST}:${PI_MEDIA_DIR}/journal.json"
else
    echo -e "${RED}Warning: No journal JSON file found in export!${NC}"
    echo "Looking for JSON files in export directory:"
    ls -la "$LATEST_EXPORT"/*.json 2>/dev/null || echo "No .json files found"
    echo -e "${YELLOW}Expected one of: 'Sand Collection.json', 'Journal.json', or 'journal.json'${NC}"
fi

# Set proper permissions
echo -e "\n${YELLOW}Setting permissions...${NC}"
ssh "${PI_USER}@${PI_HOST}" "find ${PI_MEDIA_DIR} -type d -exec chmod 755 {} + && find ${PI_MEDIA_DIR} -type f -exec chmod 644 {} +"

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