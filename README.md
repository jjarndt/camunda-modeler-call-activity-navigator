# Call Activity Navigator

[![GitHub Release](https://img.shields.io/github/v/release/jjarndt/camunda-modeler-call-activity-navigator)](https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases)
[![Camunda Modeler 5.x+](https://img.shields.io/badge/Camunda%20Modeler-5.x+-blue)](https://camunda.com/download/modeler/)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A [Camunda Modeler](https://camunda.com/download/modeler/) plugin that enables one-click navigation from Call Activities to their referenced process definitions.

**Features:**
- Navigate directly from any Call Activity to its target process
- Automatic indexing of all BPMN files in your workspace
- Supports both Camunda 7 (`calledElement`) and Camunda 8 (`zeebe:CalledElement`)

## Installation

| Method | Instructions |
|--------|--------------|
| **Quick** (macOS/Linux) | `curl -fsSL https://raw.githubusercontent.com/jjarndt/camunda-modeler-call-activity-navigator/master/install.sh \| bash` |
| **Download** | Extract [latest release](https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/latest) to plugins directory |
| **Manual** | Clone repo to plugins directory, run `npm install && npm run build` |

<details>
<summary><b>Plugin directory paths</b></summary>

| OS | Path |
|----|------|
| Windows | `%APPDATA%\camunda-modeler\plugins\` |
| macOS | `~/Library/Application Support/camunda-modeler/plugins/` |
| Linux | `~/.config/camunda-modeler/plugins/` |

</details>

## License

[MIT](LICENSE) - [Jakob Arndt](https://github.com/jjarndt)
