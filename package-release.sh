#!/bin/bash
# Creates ready-to-use ZIP (no npm required for users)
set -e

PLUGIN_NAME="camunda-modeler-call-activity-navigator"
VERSION=$(node -p "require('./package.json').version")

rm -rf release && mkdir -p release/$PLUGIN_NAME

npm run build --silent

# Only essential files - no build step needed for users
cp index.js release/$PLUGIN_NAME/
cp -r dist release/$PLUGIN_NAME/
cp LICENSE release/$PLUGIN_NAME/

cd release && zip -rq "../${PLUGIN_NAME}-${VERSION}.zip" "$PLUGIN_NAME" && cd ..
rm -rf release

echo "Created: ${PLUGIN_NAME}-${VERSION}.zip (ready-to-use, no npm required)"
