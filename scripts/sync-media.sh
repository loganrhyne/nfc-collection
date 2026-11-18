#!/bin/bash
# Media sync script for NFC Collection
# Run this from your non-dev machine to sync Day One exports to the Pi.
#
# Usage:
#   sync-media.sh [--merge | --replace] [--yes] [EXPORT]
#
#   EXPORT     A Day One export: a .zip file or an unzipped directory.
#              Default: the most recently modified directory in SOURCE_BASE_DIR.
#   --merge    Upsert the export's entries into the deployed journal by uuid.
#              Existing entries are replaced in place, new ones appended, and
#              everything else on the Pi is kept. Default for .zip exports, so a
#              one-entry export adds one entry instead of replacing the journal.
#   --replace  Replace the deployed journal with the export's journal.
#              Default for directory exports (a full Day One export).
#   --yes      Skip the confirmation prompt.
#
# PI_HOST, PI_USER, PI_MEDIA_DIR and SOURCE_BASE_DIR can be overridden from
# the environment.

# Fail loudly: this script replaces the journal the display reads and the
# registration flow writes onto physical tags, so partial success is worse
# than no success.
set -euo pipefail

# Configuration
SOURCE_BASE_DIR="${SOURCE_BASE_DIR:-$HOME/Public/Drop Box/Day One Exports}"
PI_HOST="${PI_HOST:-192.168.1.114}"  # Or use nfc-pi.local if DNS works
PI_USER="${PI_USER:-loganrhyne}"
PI_MEDIA_DIR="${PI_MEDIA_DIR:-/home/loganrhyne/nfc-media}"
REMOTE="${PI_USER}@${PI_HOST}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

die() { echo -e "${RED}Error: $*${NC}" >&2; exit 1; }
usage() { sed -n '4,20p' "$0" | sed 's/^# \{0,1\}//'; }

MODE=""
ASSUME_YES=false
EXPORT_ARG=""
while [ $# -gt 0 ]; do
    case "$1" in
        --merge) MODE="merge" ;;
        --replace) MODE="replace" ;;
        --yes|-y) ASSUME_YES=true ;;
        -h|--help) usage; exit 0 ;;
        -*) usage >&2; die "unknown option: $1" ;;
        *) [ -z "$EXPORT_ARG" ] || die "only one export can be synced at a time"
           EXPORT_ARG="$1" ;;
    esac
    shift
done

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/sync-media.XXXXXX")"
trap 'rm -rf "$WORK_DIR"' EXIT

echo -e "${GREEN}NFC Collection - Media Sync${NC}"
echo "==============================="

# --- locate the export ---------------------------------------------------
if [ -n "$EXPORT_ARG" ]; then
    [ -e "$EXPORT_ARG" ] || die "no such export: $EXPORT_ARG"
    EXPORT_PATH="$EXPORT_ARG"
else
    echo -e "\n${YELLOW}Finding most recent export in $SOURCE_BASE_DIR...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        EXPORT_PATH=$(find "$SOURCE_BASE_DIR" -maxdepth 1 -type d ! -path "$SOURCE_BASE_DIR" -exec stat -f "%m %N" {} \; | sort -rn | head -n 1 | cut -d' ' -f2-)
    else
        EXPORT_PATH=$(find "$SOURCE_BASE_DIR" -maxdepth 1 -type d ! -path "$SOURCE_BASE_DIR" -exec stat -c "%Y %n" {} \; | sort -rn | head -n 1 | cut -d' ' -f2-)
    fi
    [ -n "$EXPORT_PATH" ] || die "no Day One export directories found in $SOURCE_BASE_DIR"
fi

if [ -f "$EXPORT_PATH" ]; then
    case "$EXPORT_PATH" in
        *.zip|*.ZIP) ;;
        *) die "export must be a .zip file or a directory: $EXPORT_PATH" ;;
    esac
    echo -e "\n${YELLOW}Unzipping $(basename "$EXPORT_PATH")...${NC}"
    unzip -q "$EXPORT_PATH" -d "$WORK_DIR/export"
    EXPORT_DIR="$WORK_DIR/export"
    # Finder-made zips carry resource forks; they are not media.
    rm -rf "$EXPORT_DIR/__MACOSX"
    find "$EXPORT_DIR" -name '.DS_Store' -delete
    # Tolerate a zip that wraps everything in one top-level folder.
    shopt -s nullglob
    top=("$EXPORT_DIR"/*)
    shopt -u nullglob
    if [ ${#top[@]} -eq 1 ] && [ -d "${top[0]}" ]; then
        EXPORT_DIR="${top[0]}"
    fi
    MODE="${MODE:-merge}"
else
    EXPORT_DIR="$EXPORT_PATH"
    MODE="${MODE:-replace}"
fi

echo "Export: $EXPORT_PATH"
echo "Mode:   $MODE"

JOURNAL_SRC=""
for candidate in "Sand Collection.json" "Journal.json" "journal.json"; do
    if [ -f "$EXPORT_DIR/$candidate" ]; then
        JOURNAL_SRC="$EXPORT_DIR/$candidate"
        break
    fi
done
[ -n "$JOURNAL_SRC" ] || die "no journal JSON found in the export
Expected one of: 'Sand Collection.json', 'Journal.json', 'journal.json'"

count_files() { [ -d "$1" ] && find "$1" -type f | wc -l | tr -d ' ' || echo 0; }
PHOTO_COUNT=$(count_files "$EXPORT_DIR/photos")
VIDEO_COUNT=$(count_files "$EXPORT_DIR/videos")
echo -e "\nFiles found:"
echo "  Journal: $(basename "$JOURNAL_SRC")"
echo "  Photos:  $PHOTO_COUNT"
echo "  Videos:  $VIDEO_COUNT"

# --- read what is deployed ---------------------------------------------------
# Compare against what is actually deployed, so a partial export cannot
# silently replace a complete one, and so a merge has a base to merge into.
# -n is essential: without it ssh reads stdin and swallows the y/N answer
# below, silently cancelling the sync.
echo -e "\n${YELLOW}Reading deployed journal from $PI_HOST...${NC}"
DEPLOYED="$WORK_DIR/deployed.json"
if ssh -n "$REMOTE" "cat '${PI_MEDIA_DIR}/journal.json'" > "$DEPLOYED" 2>/dev/null \
        && [ -s "$DEPLOYED" ]; then
    BASELINE_COUNT=$(python3 -c "import json,sys;print(len(json.load(open(sys.argv[1])).get('entries',[])))" "$DEPLOYED" 2>/dev/null || echo "")
    DEPLOYED_SHA=$(shasum -a 256 "$DEPLOYED" | cut -d' ' -f1)
else
    BASELINE_COUNT=""
    DEPLOYED_SHA=""
fi
[ -n "$BASELINE_COUNT" ] && echo "Deployed entries: $BASELINE_COUNT"

# --- validate (and merge) before anything is copied ------------------------
# The journal is served directly to the dashboard and its coordinates are
# written onto NFC tags, so a partial or malformed export is expensive to undo.
if [ "$MODE" = "merge" ]; then
    [ -n "$BASELINE_COUNT" ] || die "could not read the deployed journal on $PI_HOST - a merge needs it as its base. Nothing was copied."

    echo -e "\n${YELLOW}Validating export entries...${NC}"
    # Media is checked here, against the export alone: the merged journal
    # references every photo on the Pi, most of which are not in this export.
    python3 "$SCRIPT_DIR/validate-journal.py" "$JOURNAL_SRC" --media-dir "$EXPORT_DIR" \
        || die "export failed validation. Nothing was copied."

    echo -e "\n${YELLOW}Merging into deployed journal...${NC}"
    UPLOAD_JOURNAL="$WORK_DIR/journal.json"
    set +e
    python3 "$SCRIPT_DIR/merge-journal.py" "$DEPLOYED" "$JOURNAL_SRC" -o "$UPLOAD_JOURNAL"
    merge_rc=$?
    set -e
    case $merge_rc in
        0) ;;
        2) UPLOAD_JOURNAL="" ;;  # journal unchanged; media may still be new
        *) die "merge refused. Nothing was copied." ;;
    esac

    if [ -n "$UPLOAD_JOURNAL" ]; then
        echo -e "\n${YELLOW}Validating merged journal...${NC}"
        python3 "$SCRIPT_DIR/validate-journal.py" "$UPLOAD_JOURNAL" --baseline-count "$BASELINE_COUNT" \
            || die "merged journal failed validation. Nothing was copied."
    fi
else
    echo -e "\n${YELLOW}Validating export...${NC}"
    VALIDATE_ARGS=("$JOURNAL_SRC" "--media-dir" "$EXPORT_DIR")
    if [ -n "$BASELINE_COUNT" ]; then
        VALIDATE_ARGS+=("--baseline-count" "$BASELINE_COUNT")
    else
        echo -e "${YELLOW}(could not read deployed journal - skipping shrink check)${NC}"
    fi
    python3 "$SCRIPT_DIR/validate-journal.py" "${VALIDATE_ARGS[@]}" \
        || die "export failed validation. Nothing was copied."
    UPLOAD_JOURNAL="$JOURNAL_SRC"
fi

# --- confirm -------------------------------------------------------------------
if [ -z "$UPLOAD_JOURNAL" ] && [ "$PHOTO_COUNT" -eq 0 ] && [ "$VIDEO_COUNT" -eq 0 ]; then
    echo -e "\n${GREEN}Nothing to sync.${NC}"
    exit 0
fi
if [ "$ASSUME_YES" != true ]; then
    read -p "Sync to $PI_HOST:$PI_MEDIA_DIR? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Sync cancelled."
        exit 0
    fi
fi

# --- copy --------------------------------------------------------------------
echo -e "\n${YELLOW}Preparing remote directories...${NC}"
ssh -n "$REMOTE" "mkdir -p '${PI_MEDIA_DIR}/photos' '${PI_MEDIA_DIR}/videos'"

# Media first, so the new journal never references files that are not there
# yet. Only new/changed files are sent; nothing on the Pi is deleted.
for kind in photos videos; do
    if [ -d "$EXPORT_DIR/$kind" ]; then
        echo -e "\n${YELLOW}Syncing $kind...${NC}"
        rsync -avz --progress --itemize-changes \
            "$EXPORT_DIR/$kind/" "${REMOTE}:${PI_MEDIA_DIR}/$kind/"
    fi
done

if [ -n "$UPLOAD_JOURNAL" ]; then
    echo -e "\n${YELLOW}Uploading journal...${NC}"
    rsync -az --checksum "$UPLOAD_JOURNAL" "${REMOTE}:${PI_MEDIA_DIR}/journal.json.incoming"

    # Swap it in atomically, keeping a timestamped backup. Refuse if the
    # deployed journal changed since it was read, rather than overwrite
    # whatever changed it.
    STAMP=$(date +%Y%m%d-%H%M%S)
    ssh -n "$REMOTE" "set -e; cd '${PI_MEDIA_DIR}';
        if [ -f journal.json ]; then
            if [ -n '${DEPLOYED_SHA}' ] && [ \"\$(sha256sum journal.json | cut -d' ' -f1)\" != '${DEPLOYED_SHA}' ]; then
                rm -f journal.json.incoming
                echo 'deployed journal changed during the sync - not replaced' >&2
                exit 3
            fi
            cp -p journal.json journal.json.bak-${STAMP}
        fi
        mv journal.json.incoming journal.json" \
        || die "journal was not replaced. Media already copied is harmless; re-run the sync."
    echo "Previous journal kept as journal.json.bak-${STAMP}"
fi

# Set proper permissions
echo -e "\n${YELLOW}Setting permissions...${NC}"
ssh -n "$REMOTE" "find '${PI_MEDIA_DIR}' -type d -exec chmod 755 {} + && find '${PI_MEDIA_DIR}' -type f -exec chmod 644 {} +"

# Show disk usage
echo -e "\n${YELLOW}Remote disk usage:${NC}"
ssh -n "$REMOTE" "du -sh '${PI_MEDIA_DIR}'/photos '${PI_MEDIA_DIR}'/videos '${PI_MEDIA_DIR}'/journal.json"

echo -e "\n${GREEN}✓ Media sync complete!${NC}"
echo "Media location on Pi: ${PI_MEDIA_DIR}"
