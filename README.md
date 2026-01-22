# Call Activity Navigator

A Camunda Modeler plugin that adds a context pad entry to Call Activities for quickly opening the referenced process.

## Features

- Adds a "+" icon to the context pad when clicking on a Call Activity
- Supports both Camunda 7 (Platform) and Camunda 8 (Zeebe) Call Activities
- Opens the referenced process in a new tab

## Installation

1. Build the plugin:
   ```bash
   npm install
   npm run build
   ```

2. Copy the plugin folder to your Camunda Modeler plugins directory:
   - Windows: `%APPDATA%/camunda-modeler/plugins/`
   - macOS: `~/Library/Application Support/camunda-modeler/plugins/`
   - Linux: `~/.config/camunda-modeler/plugins/`

3. Restart Camunda Modeler

## Usage

1. Open a BPMN file containing a Call Activity
2. Click on the Call Activity element
3. Click the "+" icon in the context pad to open the referenced process

## Development

```bash
npm install
npm run dev
```

## Compatibility

- Camunda Modeler 5.x+
- Camunda 7 (Platform) and Camunda 8 (Cloud/Zeebe)

## License

MIT
