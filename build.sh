#!/bin/bash

# GitShare Extension - Build Script
# Creates a clean, production-ready ZIP file for distribution

set -e

echo "🔨 Building GitShare Extension..."
echo ""

# Validate configuration before building
echo "🔍 Validating configuration..."

if grep -q "YOUR_GITHUB_CLIENT_ID_HERE" config.js; then
    echo "❌ ERROR: Please update GITHUB_CLIENT_ID in config.js first!"
    echo "   Go to: https://github.com/settings/developers"
    exit 1
fi

if grep -q "http://localhost:8000" config.js; then
    echo "⚠️  WARNING: BACKEND_URL is still set to localhost"
    echo "   Update config.js with your production backend URL"
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if grep -q "ENVIRONMENT: 'development'" config.js; then
    echo "⚠️  WARNING: ENVIRONMENT is set to 'development'"
    echo "   Consider setting it to 'production' in config.js"
fi

if grep -q "DEBUG: true" config.js; then
    echo "⚠️  WARNING: DEBUG is enabled"
    echo "   Consider setting it to false in config.js"
fi

echo "✅ Configuration validated"
echo ""

# Configuration
VERSION=$(grep '"version"' manifest.json | cut -d '"' -f 4)
BUILD_DIR="build"
OUTPUT_ZIP="gitshare-extension-v${VERSION}.zip"

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf "$BUILD_DIR"
rm -f "$OUTPUT_ZIP"
mkdir -p "$BUILD_DIR"

# Copy necessary files
echo "📦 Copying extension files..."
cp manifest.json "$BUILD_DIR/"
cp popup.html "$BUILD_DIR/"
cp popup.js "$BUILD_DIR/"
cp background.js "$BUILD_DIR/"
cp config.js "$BUILD_DIR/"
cp styles.css "$BUILD_DIR/"

# Copy icons directory
echo "🎨 Copying icons..."
cp -r icons "$BUILD_DIR/"

# Remove any development files
echo "🗑️  Removing development files..."
find "$BUILD_DIR" -name ".DS_Store" -delete
find "$BUILD_DIR" -name "*.map" -delete
find "$BUILD_DIR" -name "*.log" -delete
find "$BUILD_DIR" -name "Thumbs.db" -delete

# Create zip file
echo "📦 Creating ZIP archive..."
cd "$BUILD_DIR"
zip -r ../"$OUTPUT_ZIP" . > /dev/null
cd ..

# Calculate size
SIZE=$(du -h "$OUTPUT_ZIP" | cut -f1)

echo ""
echo "✅ Build complete!"
echo "📦 Package: $OUTPUT_ZIP"
echo "📏 Size: $SIZE"
echo ""
echo "🎉 Ready to share with users!"
echo ""
echo "👥 Users need to:"
echo "   1. Extract $OUTPUT_ZIP"
echo "   2. Open chrome://extensions"
echo "   3. Enable 'Developer mode'"
echo "   4. Click 'Load unpacked'"
echo "   5. Select extracted folder"
echo "   6. Click GitShare icon → Login with GitHub"
echo "   7. That's it! No configuration needed!"
echo ""
echo "📤 Share via:"
echo "   - Google Drive / Dropbox"
echo "   - GitHub Releases"
echo "   - Email attachment"
echo "   - Your website"
