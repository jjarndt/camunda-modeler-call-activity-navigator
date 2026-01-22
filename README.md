# Call Activity Navigator

[![GitHub release](https://img.shields.io/github/v/release/jjarndt/camunda-modeler-call-activity-navigator)](https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Camunda Modeler](https://img.shields.io/badge/Camunda%20Modeler-5.x%2B-blue)](https://camunda.com/download/modeler/)

A Camunda Modeler plugin that adds a context pad entry to Call Activities for quickly opening the referenced process.

## ✨ Features

- **One-Click Navigation**: Click on any Call Activity to open the referenced process definition
- **Camunda 7 Support**: Works with Platform Call Activities using `calledElement` attribute
- **Camunda 8 Support**: Works with Zeebe Call Activities using `zeebe:CalledElement` extension
- **Automatic Indexing**: Scans and indexes all BPMN processes in your workspace
- **Smart Discovery**: Finds process definitions across your entire project directory

## 📦 Installation

### Quick Install (macOS & Linux)

Run this one-liner in your terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/jjarndt/camunda-modeler-call-activity-navigator/master/install.sh | bash
```

Then restart Camunda Modeler.

### Manual Installation

#### macOS

```bash
cd ~/Library/Application\ Support/camunda-modeler/plugins
git clone https://github.com/jjarndt/camunda-modeler-call-activity-navigator.git
cd camunda-modeler-call-activity-navigator
npm install && npm run build
```

#### Linux

```bash
cd ~/.config/camunda-modeler/plugins
git clone https://github.com/jjarndt/camunda-modeler-call-activity-navigator.git
cd camunda-modeler-call-activity-navigator
npm install && npm run build
```

#### Windows

1. Open PowerShell and navigate to plugins directory:
   ```powershell
   cd $env:APPDATA\camunda-modeler\plugins
   ```

2. Clone and build:
   ```powershell
   git clone https://github.com/jjarndt/camunda-modeler-call-activity-navigator.git
   cd camunda-modeler-call-activity-navigator
   npm install
   npm run build
   ```

### Download Release (Alternative)

1. Download `camunda-modeler-call-activity-navigator.zip` from [latest release](https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/latest)
2. Extract to your plugins directory:
   - **Windows**: `%APPDATA%\camunda-modeler\plugins\`
   - **macOS**: `~/Library/Application Support/camunda-modeler/plugins/`
   - **Linux**: `~/.config/camunda-modeler/plugins/`
3. Restart Camunda Modeler

> **Note**: After extraction, make sure the folder structure is `plugins/camunda-modeler-call-activity-navigator/index.js` and not `plugins/camunda-modeler-call-activity-navigator/camunda-modeler-call-activity-navigator/index.js`

## 🚀 Usage

1. Open a BPMN file containing a Call Activity
2. Click on the Call Activity element to reveal the context pad
3. Click the external link icon in the context pad
4. The referenced process opens automatically in a new tab

## 🛠️ Development

### Setup with Symbolic Link (Recommended)

For easier development, create a symbolic link from the plugin directory to your development folder:

**macOS / Linux:**
```bash
ln -s /path/to/your/camunda-modeler-call-activity-navigator ~/Library/Application\ Support/camunda-modeler/plugins/camunda-modeler-call-activity-navigator
```

**Windows (as Administrator):**
```powershell
mklink /d "%APPDATA%\camunda-modeler\plugins\camunda-modeler-call-activity-navigator" "C:\path\to\your\camunda-modeler-call-activity-navigator"
```

### Build & Watch

```bash
npm install
npm run dev
```

The plugin will automatically rebuild when you make changes to the source files.

### Reload Plugin

To test your changes:
1. Press `F12` to open Developer Tools
2. Press `Ctrl+R` (Windows/Linux) or `Cmd+R` (macOS) to reload

## 🐛 Troubleshooting

### Plugin not showing up

1. **Check plugin location**: Make sure the plugin is in the correct directory
2. **Verify folder structure**: The structure should be `plugins/camunda-modeler-call-activity-navigator/index.js`
3. **Restart Camunda Modeler**: Close and reopen the application completely
4. **Check console**: Press `F12` and look for errors in the console

### Process not found error

1. **Wait for indexing**: The plugin needs a few seconds to scan your BPMN files
2. **Check process ID**: Ensure the Call Activity references the correct process ID
3. **Verify file location**: The referenced process must be in the same project directory or subdirectories

### Build errors

1. **Node.js version**: Make sure you have Node.js 18+ installed
2. **Clean install**: Try deleting `node_modules` and running `npm install` again
3. **Check permissions**: Ensure you have write permissions in the plugin directory

## 🔧 Compatibility

- **Camunda Modeler**: 5.x or higher
- **Camunda Platform**: 7.x (Platform)
- **Camunda Platform**: 8.x (Cloud/Zeebe)

## Author

Jakob Arndt

## License

MIT
