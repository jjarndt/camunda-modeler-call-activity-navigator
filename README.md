# Call Activity Navigator

[![GitHub release](https://img.shields.io/github/v/release/jjarndt/camunda-modeler-call-activity-navigator)](https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Camunda Modeler](https://img.shields.io/badge/Camunda%20Modeler-5.x%2B-blue)](https://camunda.com/download/modeler/)

A Camunda Modeler plugin that adds a context pad entry to Call Activities for quickly opening the referenced process.

## Features

- One-click navigation to referenced process definitions
- Support for Camunda 7 (`calledElement`) and Camunda 8 (`zeebe:CalledElement`)
- Automatic indexing and discovery of BPMN processes in your workspace

## Installation

**Quick Install (macOS/Linux):**
```bash
curl -fsSL https://raw.githubusercontent.com/jjarndt/camunda-modeler-call-activity-navigator/master/install.sh | bash
```

**Download Release:** Get `camunda-modeler-call-activity-navigator.zip` from [releases](https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/latest), extract to plugins directory, restart Modeler.

**Manual Install:**
```bash
# Navigate to plugins directory first:
# Windows:  cd $env:APPDATA\camunda-modeler\plugins
# macOS:    cd ~/Library/Application\ Support/camunda-modeler/plugins
# Linux:    cd ~/.config/camunda-modeler/plugins

git clone https://github.com/jjarndt/camunda-modeler-call-activity-navigator.git
cd camunda-modeler-call-activity-navigator
npm install && npm run build
```

> Note: Ensure folder structure is `plugins/camunda-modeler-call-activity-navigator/index.js`

## Usage

1. Open a BPMN file with a Call Activity
2. Click on the Call Activity to reveal the context pad
3. Click the external link icon
4. Referenced process opens in a new tab

## Development

**Setup:** Create a symbolic link to your dev folder (optional but recommended):
```bash
# macOS/Linux:
ln -s /path/to/dev/folder ~/Library/Application\ Support/camunda-modeler/plugins/camunda-modeler-call-activity-navigator

# Windows (Admin):
mklink /d "%APPDATA%\camunda-modeler\plugins\camunda-modeler-call-activity-navigator" "C:\path\to\dev\folder"
```

**Build & Watch:**
```bash
npm install
npm run dev  # Auto-rebuilds on file changes
```

**Reload Plugin:** Press `F12` to open DevTools, then `Ctrl+R` (or `Cmd+R` on macOS)

## Troubleshooting

**Plugin not showing up:** Check plugin location (`plugins/camunda-modeler-call-activity-navigator/index.js`), restart Modeler, check console (`F12`) for errors.

**Process not found:** Wait a few seconds for indexing, verify process ID matches, ensure referenced process is in project directory.

**Build errors:** Requires Node.js 18+. Try `rm -rf node_modules && npm install`. Check write permissions.

## Compatibility

- Camunda Modeler 5.x+
- Camunda Platform 7.x and 8.x

## Author

Jakob Arndt

## License

MIT
