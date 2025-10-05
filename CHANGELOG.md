# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.5] - 2025-10-05

### Added

- Export `errorMiddlware`, `trackServerEvent`, `trackServerError` as part of default `hearald` in `src/index.js'

### Fixed

- Bugfix to restore intra-day timestamp granularity of events.
- Percent formatted numbers now use proper formatter

### Changed

- All server-side configuration parameters are defined in `src/server/configuration.js`

## [0.0.4] - 2025-09-21

### Changed

- Use package.json `exports`

## [0.0.3] - 2025-09-19

### Added

- Initial release of Hearald

[0.0.5]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/olivierlacan/keep-a-changelog/releases/tag/v0.0.3

<!--
`Added` for new features.
`Changed` for changes in existing functionality.
`Deprecated` for soon-to-be removed features.
`Removed` for now removed features.
`Fixed` for any bug fixes.
`Security` in case of vulnerabilities.
-->
