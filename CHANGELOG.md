# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-22

### Added
- Initial release of Call Activity Navigator plugin
- Context pad entry for Call Activities with external link icon
- Support for Camunda 7 (Platform) Call Activities with `calledElement` attribute
- Support for Camunda 8 (Zeebe) Call Activities with `zeebe:CalledElement` extension
- Automatic process indexing when opening BPMN files
- File context scanning for discovering processes in workspace
- One-click navigation to referenced process definitions
- User notifications when referenced process cannot be found

### Features
- Click on Call Activity to reveal context pad with navigation button
- Opens referenced process in new tab within Camunda Modeler
- Automatically indexes all BPMN files in project directories
- Supports both platform-specific implementations (Camunda 7 and 8)

[1.0.0]: https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v1.0.0
