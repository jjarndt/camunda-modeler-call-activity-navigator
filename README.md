# Call Activity Navigator

[![GitHub Release](https://img.shields.io/github/v/release/jjarndt/camunda-modeler-call-activity-navigator)](https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases)
[![Camunda Modeler 5.x+](https://img.shields.io/badge/Camunda%20Modeler-5.x+-blue)](https://camunda.com/download/modeler/)
[![Camunda 7](https://img.shields.io/badge/Camunda%207-supported-green)](https://docs.camunda.org/manual/)
[![Camunda 8](https://img.shields.io/badge/Camunda%208-supported-green)](https://docs.camunda.io/)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A [Camunda Modeler](https://camunda.com/download/modeler/) plugin that enables one-click navigation from Call Activities to their referenced process definitions.

- Navigate directly from any Call Activity to its target process
- Automatic indexing of all BPMN files in your workspace
- Supports Camunda 7 (`calledElement`) and Camunda 8 (`zeebe:CalledElement`)
- Detects embedded processes (multiple processes in the same BPMN file) and shows an info message instead of attempting to open a non-existent file

---

## Installation

### Download Release
> No npm required — just extract and restart Modeler

<details>
<summary><b>macOS</b></summary>

```bash
cd ~/Library/Application\ Support/camunda-modeler/plugins
curl -LO https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/latest/download/camunda-modeler-call-activity-navigator-1.2.1.zip
unzip camunda-modeler-call-activity-navigator-1.2.1.zip && rm camunda-modeler-call-activity-navigator-1.2.1.zip
```
</details>

<details>
<summary><b>Linux</b></summary>

```bash
cd ~/.config/camunda-modeler/plugins
curl -LO https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/latest/download/camunda-modeler-call-activity-navigator-1.2.1.zip
unzip camunda-modeler-call-activity-navigator-1.2.1.zip && rm camunda-modeler-call-activity-navigator-1.2.1.zip
```
</details>

<details>
<summary><b>Windows</b></summary>

```powershell
cd $env:APPDATA\camunda-modeler\plugins
Invoke-WebRequest -Uri "https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/latest/download/camunda-modeler-call-activity-navigator-1.2.1.zip" -OutFile "plugin.zip"
Expand-Archive plugin.zip -DestinationPath . ; Remove-Item plugin.zip
```
</details>

---

### Build from Source
> Requires Node.js and npm

<details>
<summary><b>macOS</b></summary>

```bash
cd ~/Library/Application\ Support/camunda-modeler/plugins
git clone https://github.com/jjarndt/camunda-modeler-call-activity-navigator.git
cd camunda-modeler-call-activity-navigator && npm i && npm run build
```
</details>

<details>
<summary><b>Linux</b></summary>

```bash
cd ~/.config/camunda-modeler/plugins
git clone https://github.com/jjarndt/camunda-modeler-call-activity-navigator.git
cd camunda-modeler-call-activity-navigator && npm i && npm run build
```
</details>

<details>
<summary><b>Windows</b></summary>

```powershell
cd $env:APPDATA\camunda-modeler\plugins
git clone https://github.com/jjarndt/camunda-modeler-call-activity-navigator.git
cd camunda-modeler-call-activity-navigator; npm i; npm run build
```
</details>

---

## License

[MIT](LICENSE) — [Jakob Arndt](https://github.com/jjarndt)
