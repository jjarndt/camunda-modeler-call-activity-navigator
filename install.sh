#!/bin/bash

# Quick install script for Camunda Modeler Call Activity Navigator Plugin
# Usage: curl -fsSL https://raw.githubusercontent.com/jjarndt/camunda-modeler-call-activity-navigator/master/install.sh | bash

set -e

PLUGIN_NAME="camunda-modeler-call-activity-navigator"
LATEST_RELEASE_URL="https://api.github.com/repos/jjarndt/camunda-modeler-call-activity-navigator/releases/latest"

echo "🚀 Installing $PLUGIN_NAME..."

# Determine OS and set plugin directory
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLUGIN_DIR="$HOME/Library/Application Support/camunda-modeler/plugins/$PLUGIN_NAME"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLUGIN_DIR="$HOME/.config/camunda-modeler/plugins/$PLUGIN_NAME"
else
    echo "❌ Unsupported operating system: $OSTYPE"
    echo "Please install manually following the instructions at:"
    echo "https://github.com/jjarndt/camunda-modeler-call-activity-navigator#installation"
    exit 1
fi

# Create plugins directory if it doesn't exist
mkdir -p "$(dirname "$PLUGIN_DIR")"

# Clone or update repository
if [ -d "$PLUGIN_DIR" ]; then
    echo "📦 Plugin directory exists. Updating..."
    cd "$PLUGIN_DIR"
    git pull
else
    echo "📦 Cloning plugin repository..."
    git clone https://github.com/jjarndt/camunda-modeler-call-activity-navigator.git "$PLUGIN_DIR"
    cd "$PLUGIN_DIR"
fi

# Install dependencies and build
if command -v npm &> /dev/null; then
    echo "📦 Installing dependencies..."
    npm install --silent
    echo "🔨 Building plugin..."
    npm run build
else
    echo "⚠️  npm not found. Skipping build step."
    echo "Please install Node.js and run 'npm install && npm run build' manually."
fi

echo ""
echo "✅ Installation complete!"
echo "📁 Plugin installed at: $PLUGIN_DIR"
echo ""
echo "⚠️  Please restart Camunda Modeler for the plugin to take effect."
