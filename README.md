# Call Activity Navigator

[![CI](https://github.com/jjarndt/camunda-modeler-call-activity-navigator/actions/workflows/ci.yml/badge.svg)](https://github.com/jjarndt/camunda-modeler-call-activity-navigator/actions/workflows/ci.yml)
[![GitHub Release](https://img.shields.io/github/v/release/jjarndt/camunda-modeler-call-activity-navigator)](https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases)
[![Camunda 7](https://img.shields.io/badge/Camunda%207-supported-green)](https://docs.camunda.org/manual/)
[![Camunda 8](https://img.shields.io/badge/Camunda%208-supported-green)](https://docs.camunda.io/)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A [Camunda Modeler](https://camunda.com/download/modeler/) plugin (5.x+) for one-click navigation from Call Activities to their referenced process definitions.

**Features**

- Navigate from any Call Activity to its target process with a single click
- Automatic indexing of all BPMN files in the workspace
- Supports Camunda 7 (`calledElement`) and Camunda 8 (`zeebe:CalledElement`)
- Detects embedded processes within the same BPMN file
- Cross-platform: macOS, Linux, Windows

## Installation

### Quick Install (macOS / Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/jjarndt/camunda-modeler-call-activity-navigator/master/install.sh | bash
```

### Manual Download

Download the latest ZIP from the [Releases page](https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/latest), extract it to the Camunda Modeler plugins directory, and restart the Modeler.

| OS      | Plugins Directory                                |
|---------|--------------------------------------------------|
| macOS   | `~/Library/Application Support/camunda-modeler/plugins` |
| Linux   | `~/.config/camunda-modeler/plugins`              |
| Windows | `%APPDATA%\camunda-modeler\plugins`              |

### Build from Source

```bash
git clone https://github.com/jjarndt/camunda-modeler-call-activity-navigator.git
cd camunda-modeler-call-activity-navigator
npm install
npm run build
```

Copy the resulting directory to the plugins directory listed above.

## Usage

1. Open a BPMN diagram containing Call Activities
2. Click on a Call Activity element
3. Click the external link icon in the context pad
4. The referenced process opens in a new tab

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

[MIT](LICENSE) -- Jakob Arndt
