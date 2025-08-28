# Media Management for NFC Collection

## Overview

The NFC Collection app now uses a cleaner separation between application code and media files. Media files (photos, videos, journal.json) are stored in a persistent directory on the Pi that survives deployments.

## Architecture

### Directory Structure

```
/home/loganrhyne/
├── nfc-collection/              # Application code (managed by git/deploy.sh)
│   └── dashboard-ui/
│       └── build/
│           └── data/            # Symlink to → /home/loganrhyne/nfc-media
└── nfc-media/                   # Persistent media storage (outside git)
    ├── photos/                  # Journal photos
    ├── videos/                  # Journal videos
    └── journal.json             # Journal data
```

### Key Benefits

1. **Persistent Storage**: Media files aren't deleted during deployments
2. **Efficient Syncing**: Only new/changed files are transferred
3. **Clean Separation**: Application code and media are managed separately
4. **Bandwidth Savings**: Large media files aren't repeatedly copied

## Usage

### Initial Setup (One Time)

1. On the Pi, the persistent media directory is automatically created by `deploy.sh`:
   ```bash
   /home/loganrhyne/nfc-media/
   ```

2. The deploy script creates a symlink from the build directory to this location:
   ```bash
   dashboard-ui/build/data → /home/loganrhyne/nfc-media
   ```

### Syncing Media Files

#### From Your Non-Dev Machine

1. **Configure the sync script** (`scripts/sync-media.sh`):
   ```bash
   # Edit these variables if needed:
   PI_HOST="nfc-pi.local"  # Or use IP: 192.168.1.114
   PI_USER="loganrhyne"
   ```

2. **Run the sync script**:
   ```bash
   ./scripts/sync-media.sh
   ```

   The script will:
   - Automatically find the most recent Day One export
   - Show you what will be synced
   - Use rsync to transfer only new/changed files
   - Preserve directory structure
   - Show progress during transfer

#### What Gets Synced

- `photos/` directory with all journal photos
- `videos/` directory with all journal videos  
- `journal.json` with all journal entry data

### Deployment Process

When you run `deploy.sh` from your dev machine:

1. React app is built with production settings
2. Build files are synced to Pi (excluding the data directory)
3. Symlink is created/verified: `build/data → /home/loganrhyne/nfc-media`
4. Services are restarted

The media files remain untouched during deployment!

## Manual Media Management

If you need to manually manage media files on the Pi:

### Check Media Directory
```bash
ssh loganrhyne@192.168.1.114
ls -la /home/loganrhyne/nfc-media/
du -sh /home/loganrhyne/nfc-media/*
```

### Verify Symlink
```bash
ls -la /home/loganrhyne/nfc-collection/dashboard-ui/build/data
```

### Manual Sync (from any machine with the media)
```bash
# Sync photos
rsync -avz --progress \
  "/path/to/Day One Export/Journal*/photos/" \
  loganrhyne@192.168.1.114:/home/loganrhyne/nfc-media/photos/

# Sync videos
rsync -avz --progress \
  "/path/to/Day One Export/Journal*/videos/" \
  loganrhyne@192.168.1.114:/home/loganrhyne/nfc-media/videos/

# Sync journal.json
rsync -avz --progress \
  "/path/to/Day One Export/Journal*/journal.json" \
  loganrhyne@192.168.1.114:/home/loganrhyne/nfc-media/
```

## Troubleshooting

### Media Not Showing in Dashboard

1. **Check symlink exists**:
   ```bash
   ls -la /home/loganrhyne/nfc-collection/dashboard-ui/build/data
   ```
   Should show: `data -> /home/loganrhyne/nfc-media`

2. **Check media directory has content**:
   ```bash
   ls -la /home/loganrhyne/nfc-media/
   ```

3. **Check permissions**:
   ```bash
   ls -la /home/loganrhyne/nfc-media/photos/ | head
   # Should show files owned by loganrhyne with 755 permissions
   ```

4. **Fix permissions if needed**:
   ```bash
   chmod -R 755 /home/loganrhyne/nfc-media/
   ```

### Sync Script Issues

1. **Can't find Day One exports**:
   - Check the path in the script matches your setup
   - Default: `~/public/Drop Box/Day One Export`

2. **SSH connection fails**:
   - Verify Pi hostname/IP
   - Check SSH keys are set up
   - Try: `ssh loganrhyne@192.168.1.114`

3. **Rsync errors**:
   - Check disk space on Pi: `df -h`
   - Verify source files exist
   - Check network connection

## Best Practices

1. **Regular Syncing**: Run sync after each Day One export
2. **Monitor Disk Space**: The Pi's SD card has limited space
3. **Backup**: Consider backing up `/home/loganrhyne/nfc-media/` periodically
4. **Clean Old Exports**: Remove old Day One export directories on your machine after syncing