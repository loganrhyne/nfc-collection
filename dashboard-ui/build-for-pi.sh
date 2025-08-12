#!/bin/bash
# Build script that excludes media files

echo "Building React app without media files..."

# Create temporary empty directories
mkdir -p public/data/photos.temp
mkdir -p public/data/videos.temp
mkdir -p public/data/pdfs.temp

# Backup and replace if media exists
if [ -d "public/data/photos" ] && [ "$(ls -A public/data/photos)" ]; then
    echo "Temporarily moving photos..."
    mv public/data/photos public/data/photos.backup
    mv public/data/photos.temp public/data/photos
fi

if [ -d "public/data/videos" ] && [ "$(ls -A public/data/videos)" ]; then
    echo "Temporarily moving videos..."
    mv public/data/videos public/data/videos.backup
    mv public/data/videos.temp public/data/videos
fi

if [ -d "public/data/pdfs" ] && [ "$(ls -A public/data/pdfs)" ]; then
    echo "Temporarily moving pdfs..."
    mv public/data/pdfs public/data/pdfs.backup
    mv public/data/pdfs.temp public/data/pdfs
fi

# Build
npm run build

# Restore original directories
if [ -d "public/data/photos.backup" ]; then
    rm -rf public/data/photos
    mv public/data/photos.backup public/data/photos
fi

if [ -d "public/data/videos.backup" ]; then
    rm -rf public/data/videos
    mv public/data/videos.backup public/data/videos
fi

if [ -d "public/data/pdfs.backup" ]; then
    rm -rf public/data/pdfs
    mv public/data/pdfs.backup public/data/pdfs
fi

# Clean up temp directories
rm -rf public/data/*.temp

echo "Build complete! The build directory contains the app without media files."
echo "Media files on the Pi should be placed in: build/data/{photos,videos,pdfs}/"