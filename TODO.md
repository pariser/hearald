# hearald TODO

## Status (August 2025)

- Event bus/evented logic, event file helpers, emit logic, admin stats, analytics helpers, and error tracking utilities have all been extracted and modularized.
- hearald now uses client/server/shared subfolders and has a working .eslintrc for Intl.
- Lint passes and all functionality is verified.
- Migration of all helpers to client/server/shared is nearly complete.

## Next Steps for hearald

1. **Tracking Custom Events**

   - Make the event schema/config easy to extend (document how to define custom events)
   - Provide a clear API for emitting custom events (e.g., `trackEvent('my_event', {...})`)

2. **Generating Statistical Summary Views**

   - Make stat definitions configurable (allow user to provide their own stat_definition.json)
   - Expose a summary API (e.g., `generateStats(endDate, timeWindow)`)
   - Document how to add new metrics and computed stats

3. **Admin UI to See Stats**
   - Provide a basic, embeddable React/Preact/Vue component for admin stats (or a template)
   - Document how to use the endpoint and client fetcher in any admin UI
   - Optionally, provide a standalone admin page as part of the package

## General Improvements

- Write clear documentation and usage examples
- Add configuration options for stat definitions and event types
- Provide ready-to-use middleware and client helpers for common event types
- Package a basic admin UI or template
- Test in a clean, new project to validate ease of adoption
