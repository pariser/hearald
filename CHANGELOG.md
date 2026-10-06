# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-06

### Security

- **Breaking:** the analytics dashboard now needs an `auth` middleware (`analytics: { auth }`), or
  `allowUnauthenticated: true` for local development. Before, anyone could read the stats.
- Added `basicAuth({ verify })`: HTTP Basic auth with a lockout after repeated wrong guesses.
- The data route now rejects dates that are not real calendar dates and time windows over 366 days
  (the date used to become part of a file path).

### Added

- `eventEndpoint: { schema }`: allowed events and parameters for the public event endpoint. Events
  not in the schema and parameters not listed are dropped, so the endpoint cannot store arbitrary text.
- `eventsDir`: where event logs and cached summaries are kept (default `events`).
- `purgeOldEvents({ days })`: deletes logs and cached summaries older than a retention period.
- `analytics` is only created when `statDefinitions` is given.

### Changed

- `express` is now a peer dependency (>=4) instead of a dependency, so the host app's Express is used.

### Fixed

- `trackServerError` and the error middleware crashed with a ReferenceError (`ERROR_EVENT` was never
  imported).
- The log level setting did nothing: the logger was built from the string `"error"` instead of the
  configuration. Levels now work (`debug`, `info`, `warn`, `error`); the default is `warn`.
- Days with no events no longer log a warning for every missing file.
- A computed metric with an unknown formula made `generateStats` loop forever; it now throws.
- `nowAsPstDate` returned a Date with a forced hour and the UTC date, so day buckets were not Pacific
  days. It now holds the real Pacific wall-clock time, with daylight saving. `defaultEndDate` uses
  UTC date maths and follows the configured `nowFn` instead of the real clock.
- Reading a window of days used local-time date maths, which could skip or repeat a day around
  daylight saving changes on servers not set to UTC.
- Stats for a window ending today were cached, so the dashboard showed stale numbers all day.
- The client's `trackError` threw when the error event had no `.error` object, and calling
  `hearald()` twice sent every event twice (the new `dispose()` and replacement fix both).
- Without a schema, the event endpoint stored events with no name or with a non-object `p`.
- A `set_of_users` metric that names an `event` now counts only users who sent that event (it used to
  count every user, whatever the event). A `filter` on event parameters already worked.
- Events with no parameters or no user no longer break metric computation.
- Open event files are tracked by full path, so changing `eventsDir` cannot reuse a stale file handle.

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
