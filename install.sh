#!/bin/bash

# Quick install script for Camunda Modeler Call Activity Navigator Plugin
# Usage: curl -fsSL https://raw.githubusercontent.com/jjarndt/camunda-modeler-call-activity-navigator/master/install.sh | bash

set -e

PLUGIN_NAME="camunda-modeler-call-activity-navigator"
REPO="jjarndt/camunda-modeler-call-activity-navigator"

echo "Installing $PLUGIN_NAME..."

# Determine OS and set plugin directory
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLUGIN_DIR="$HOME/Library/Application Support/camunda-modeler/plugins"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLUGIN_DIR="$HOME/.config/camunda-modeler/plugins"
else
    echo "Error: Unsupported operating system: $OSTYPE"
    echo "Please install manually: https://github.com/$REPO#installation"
    exit 1
fi

# Create plugins directory if it doesn't exist
mkdir -p "$PLUGIN_DIR"

# Remove previous installation if it exists
if [ -d "$PLUGIN_DIR/$PLUGIN_NAME" ]; then
    echo "Removing previous installation..."
    rm -rf "$PLUGIN_DIR/$PLUGIN_NAME"
fi

# Get latest release download URL from GitHub API
echo "Fetching latest release..."
DOWNLOAD_URL=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"browser_download_url"' | head -1 | cut -d'"' -f4)

if [ -z "$DOWNLOAD_URL" ]; then
    echo "Error: Could not determine latest release URL."
    exit 1
fi

VERSION=$(echo "$DOWNLOAD_URL" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
echo "Downloading v$VERSION..."

# Download and extract to plugins directory
TMP_ZIP=$(mktemp /tmp/camunda-plugin-XXXXXX.zip)
curl -fsSL "$DOWNLOAD_URL" -o "$TMP_ZIP"
unzip -qo "$TMP_ZIP" -d "$PLUGIN_DIR"
rm -f "$TMP_ZIP"

echo ""
echo "Installation complete! (v$VERSION)"
echo "Location: $PLUGIN_DIR/$PLUGIN_NAME"
echo ""
echo "Please restart Camunda Modeler for the plugin to take effect."
