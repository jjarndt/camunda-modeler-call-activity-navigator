# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-01-30

### Added
- Integration tests for indexing and invalidation logic using BPMN fixtures
- BPMN fixture set for regression coverage

### Fixed
- Prevent repeated re-indexing of BPMN files without processes
- Invalidate stale index entries when files change or are removed
- Windows path normalization for relative search and root detection

### Changed
- Refactored indexing and search logic into testable modules

## [1.2.0] - 2026-01-27

### Added
- Project-wide BPMN file discovery using `file-context:add-root` API
- Automatic indexing of all BPMN files in the project directory
- Support for finding Call Activities where filename differs from Process ID

### Fixed
- Fixed crash when target process file was in a distant directory
- Plugin now works reliably regardless of directory depth

### Changed
- Improved search strategy: Known files -> Relative paths -> Project scan
- Better debug logging for troubleshooting

## [1.1.0] - 2026-01-23

### Added
- Detection of embedded processes (multiple processes in the same BPMN file)
- Informative notification when a Call Activity references an embedded process in the same file
- Debug logging for embedded process detection

### Changed
- Plugin no longer attempts to open non-existent files when Call Activity references an embedded process
- Improved user experience with clear feedback for embedded process scenarios

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

[1.2.1]: https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v1.2.1
[1.2.0]: https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v1.2.0
[1.1.0]: https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v1.1.0
[1.0.0]: https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v1.0.0
