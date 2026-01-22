#!/bin/bash

# Package release script for Camunda Modeler Call Activity Navigator Plugin
# Creates a zip file ready for distribution

set -e

PLUGIN_NAME="camunda-modeler-call-activity-navigator"
VERSION=$(node -p "require('./package.json').version")
RELEASE_NAME="${PLUGIN_NAME}-${VERSION}"
RELEASE_DIR="release"

echo "📦 Packaging ${RELEASE_NAME}..."

# Clean and create release directory
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR/$PLUGIN_NAME"

# Build the plugin
echo "🔨 Building plugin..."
npm run build

# Copy necessary files
echo "📋 Copying files..."
cp -r dist "$RELEASE_DIR/$PLUGIN_NAME/"
cp index.js "$RELEASE_DIR/$PLUGIN_NAME/"
cp package.json "$RELEASE_DIR/$PLUGIN_NAME/"
cp LICENSE "$RELEASE_DIR/$PLUGIN_NAME/"
cp README.md "$RELEASE_DIR/$PLUGIN_NAME/"

# Create zip
echo "📦 Creating zip archive..."
cd "$RELEASE_DIR"
zip -r "../${RELEASE_NAME}.zip" "$PLUGIN_NAME"
cd ..

# Cleanup
rm -rf "$RELEASE_DIR"

echo ""
echo "✅ Release package created: ${RELEASE_NAME}.zip"
echo "📦 Ready for distribution!"
