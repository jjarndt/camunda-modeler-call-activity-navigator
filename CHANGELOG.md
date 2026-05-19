# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.5] - 2026-05-19

### Fixed
- Call activity icon clicks silently dropped after the first navigation. Each tab owns its own modeler/eventBus; the previous code detached the listener on every `bpmn.modeler.created` and reattached only to the latest modeler, so previously opened tabs ended up with no listener. The plugin now attaches once per modeler for its full lifetime — the listener dies with the modeler on tab close, no detach needed.

## [1.2.4] - 2026-05-19

### Fixed
- Serial queue silently dropped queued navigation tasks when a prior task rejected (e.g. on rapid double-clicks of call activities when the first jump threw). The chain now isolates rejections so each queued task still runs.

### Changed
- Extracted `createSerialQueue` to its own module (`client/serial-queue.mjs`) for testability.

## [1.2.3] - 2026-03-24

### Added
- Silent auto-update check via GitHub releases with user notification

### Fixed
- Restored broken SVG path in context pad icon
- Resolved 34 additional bugs found by systematic 6-category analysis with regression tests
- Relaxed timing thresholds in performance tests for CI stability
- Resolved eslint errors (prefer-const, eqeqeq)

### Changed
- Simplified update check to notification with GitHub link instead of auto-download
- Renamed all test files from bug-IDs to descriptive module.topic names for better readability

## [1.2.2] - 2026-03-22

### Fixed
- BPMN parser: replaced regex with stateful parser that correctly strips XML comments and CDATA sections before extracting process IDs
- Path utils: guard against non-string inputs and edge cases in normalization and drive letter handling
- Navigator search: input validation, race condition prevention in concurrent searches, defensive null checks
- Update check: validate URL before fetch, handle missing/malformed API responses, guard semver parsing
- File discovery: guard against non-array listeners parameter
- Process index: defensive checks for undefined file entries
- Index: fixed BPMN root pattern for top-level directories, serialized concurrent open-process calls, added null guards
- BPMN extension util: added safeGet helper for safe property access, null-check on element parameter

### Added
- 65 regression tests covering null-safety, API robustness, logic, data integrity, security, and performance edge cases

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

[1.2.3]: https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v1.2.3
[1.2.2]: https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v1.2.2
[1.2.1]: https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v1.2.1
[1.2.0]: https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v1.2.0
[1.1.0]: https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v1.1.0
[1.0.0]: https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v1.0.0
