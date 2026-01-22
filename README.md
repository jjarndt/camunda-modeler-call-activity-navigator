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

**Option 1: Quick Install**

<table>
<tr><td><b>macOS / Linux</b></td></tr>
<tr><td>

```bash
curl -fsSL https://raw.githubusercontent.com/jjarndt/camunda-modeler-call-activity-navigator/master/install.sh | bash
```

</td></tr>
</table>

**Option 2: [Download Release](https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/latest)**

Extract to plugins directory and restart Modeler.

**Option 3: Manual**

<table>
<tr><td><b>macOS</b></td></tr>
<tr><td>

```bash
cd ~/Library/Application\ Support/camunda-modeler/plugins
git clone https://github.com/jjarndt/camunda-modeler-call-activity-navigator.git
cd camunda-modeler-call-activity-navigator && npm i && npm run build
```

</td></tr>
<tr><td><b>Linux</b></td></tr>
<tr><td>

```bash
cd ~/.config/camunda-modeler/plugins
git clone https://github.com/jjarndt/camunda-modeler-call-activity-navigator.git
cd camunda-modeler-call-activity-navigator && npm i && npm run build
```

</td></tr>
<tr><td><b>Windows</b></td></tr>
<tr><td>

```powershell
cd $env:APPDATA\camunda-modeler\plugins
git clone https://github.com/jjarndt/camunda-modeler-call-activity-navigator.git
cd camunda-modeler-call-activity-navigator; npm i; npm run build
```

</td></tr>
</table>

## License

[MIT](LICENSE) - [Jakob Arndt](https://github.com/jjarndt)
