# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-07

### Security

- **Breaking:** the analytics dashboard now needs an `auth` middleware (`analytics: { auth }`), or
  `allowUnauthenticated: true` for local development. Before, anyone could read the stats.
- Added `basicAuth({ verify })`: HTTP Basic auth with a lockout after repeated wrong guesses.
- The data route now rejects dates that are not real calendar dates (`2026-02-31` used to be accepted
  and moved to March) and time windows over 366 days (the date used to become part of a file path).
- `basicAuth` counted a wrong guess only after `verify` finished, so any number of parallel guesses got
  past the lockout. Attempts are now counted before `verify` runs. It also accepts the `Basic` scheme
  in any letter case, answers 500 (instead of crashing an Express 4 app) when `verify` throws, and
  forgets old addresses (`maxTrackedIps`, default 10000). Its lockout needs Express's `trust proxy`
  set correctly, see the README.
- A dashboard request for a huge window could use all the server's memory. Windows whose event files
  add up to more than `maxWindowBytes` (default 64 MB) get 413 `{ "error": "window too large" }`, stats
  are computed one request at a time, and the raw events are only kept for computed histograms.

### Added

- `eventEndpoint: { schema }`: allowed events and parameters for the public event endpoint. Events
  not in the schema and parameters not listed are dropped, so the endpoint cannot store arbitrary text.
- `eventsDir`: where event logs and cached summaries are kept (default `events`).
- `purgeOldEvents({ days })`: deletes logs and cached summaries older than a retention period. It counts
  days with the configured `nowFn` and in UTC; a file dated exactly `days` days ago is kept.
- `idleCloseMs` (default 60000): how long an event file stays open after its last write.
- `maxWindowBytes` (default 64 MB): the most event data one dashboard request may read.
- The test suite runs on Express 5 and Express 4 (`npm test` runs both; `HEARALD_EXPRESS=4` or `5` picks one).
- `analytics` is only created when `statDefinitions` is given.

### Changed

- `express` is now a peer dependency (>=4) instead of a dependency, so the host app's Express is used.

### Fixed

- The dashboard router could not be built on Express 5 (`Unexpected ? at index 17`: its optional
  `:date?` route parameter is not allowed there), so `hearald({ analytics })` threw at startup. The
  data route is now registered as two routes. Express 4 behaves as before.
- A failed attempt to open an event file (disk full, read-only file system, wrong permissions) was
  remembered, so every later write failed too, and 60 seconds later closing it was an unhandled
  rejection that ended the process. A failed open is now forgotten (the next write tries again), and
  idle timers cannot reject or keep a script alive. The timer closes the file it was set for, even if
  the events directory changed meanwhile.
- The error middleware could crash the process: an error that `JSON.stringify` cannot handle (a
  circular object) or a failing write became an unhandled rejection. It now always passes the error
  on to your own handler.
- On Express 4, a failing read in the dashboard routes (an unreadable cache file, a missing
  `dist/analytics.html`) crashed the process; the error now goes to your error handler.
- The README mounted the event route at `/events` while the route inside is `/e`, so events went to
  `/events/e` and the browser client's sends quietly got a 404. The README is fixed, and the client now
  treats a non-2xx answer as a failure: `onError` is called (it still never throws).
- Cached summaries are named with a hash of the metric definitions and a format version
  (`summary:<date>:<days>:<hash>.json`), so editing a definition no longer serves numbers computed with
  the old one. Summaries cached before this change (including those written by 0.0.5, which used the
  old `set_of_users` meaning and the old day buckets) are no longer read; they can be deleted
  (`purgeOldEvents` still removes them by age).
- Histograms (raw and computed) mishandled a value named `constructor`, `toString` or `__proto__`, and
  left out the values `0`, `false` and `""`.
- A truncated last line (after a crash) glued itself to the next event and lost both. A new line is
  now started when a file is opened that does not end with one.
- `purgeOldEvents` ignored `nowFn` and used the server's local time zone.
- `dispose()` of an old client no longer silences the client that replaced it.
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

[Unreleased]: https://github.com/pariser/hearald/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/pariser/hearald/compare/v0.0.5...v0.1.0
[0.0.5]: https://github.com/pariser/hearald/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/pariser/hearald/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/pariser/hearald/releases/tag/v0.0.3

<!--
`Added` for new features.
`Changed` for changes in existing functionality.
`Deprecated` for soon-to-be removed features.
`Removed` for now removed features.
`Fixed` for any bug fixes.
`Security` in case of vulnerabilities.
-->
