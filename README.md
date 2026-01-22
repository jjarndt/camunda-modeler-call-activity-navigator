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

### Option 1: Download Release (Recommended)

1. Download the latest release from [GitHub Releases](https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases)
2. Extract the plugin to your Camunda Modeler plugins directory:
   - **Windows**: `%APPDATA%/camunda-modeler/plugins/camunda-modeler-call-activity-navigator`
   - **macOS**: `~/Library/Application Support/camunda-modeler/plugins/camunda-modeler-call-activity-navigator`
   - **Linux**: `~/.config/camunda-modeler/plugins/camunda-modeler-call-activity-navigator`
3. Restart Camunda Modeler

### Option 2: Build from Source

1. Clone this repository
2. Build the plugin:
   ```bash
   npm install
   npm run build
   ```
3. Copy the entire plugin folder to your Camunda Modeler plugins directory (see above)
4. Restart Camunda Modeler

## 🚀 Usage

1. Open a BPMN file containing a Call Activity
2. Click on the Call Activity element to reveal the context pad
3. Click the external link icon in the context pad
4. The referenced process opens automatically in a new tab

## 🛠️ Development

```bash
npm install
npm run dev
```

The plugin will automatically rebuild when you make changes to the source files.

## 🔧 Compatibility

- **Camunda Modeler**: 5.x or higher
- **Camunda Platform**: 7.x (Platform)
- **Camunda Platform**: 8.x (Cloud/Zeebe)

## Author

Jakob Arndt

## License

MIT
