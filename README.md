# Call Activity Navigator

[![GitHub release](https://img.shields.io/github/v/release/jjarndt/camunda-modeler-call-activity-navigator)](https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Camunda Modeler plugin for one-click navigation from Call Activities to referenced processes. Supports Camunda 7 and 8.

## Installation

**macOS/Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/jjarndt/camunda-modeler-call-activity-navigator/master/install.sh | bash
```

**Download:** Get the [latest release](https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/latest), extract to plugins directory, restart Modeler.

**Manual:**
```bash
cd <plugins-dir>  # See paths below
git clone https://github.com/jjarndt/camunda-modeler-call-activity-navigator.git
cd camunda-modeler-call-activity-navigator && npm install && npm run build
```

Plugin paths: `%APPDATA%\camunda-modeler\plugins` (Win), `~/Library/Application Support/camunda-modeler/plugins` (Mac), `~/.config/camunda-modeler/plugins` (Linux)

## Usage

Click Call Activity → Click external link icon in context pad → Referenced process opens.

## Development

```bash
npm install && npm run dev  # Watch mode
```

Link plugin dir for development: `ln -s <dev-folder> <plugins-dir>/camunda-modeler-call-activity-navigator`
Reload: `F12` → `Ctrl+R` / `Cmd+R`

## License

MIT - Jakob Arndt
