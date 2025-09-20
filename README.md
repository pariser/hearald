# hearald

A whimsical event bus and evented utility for client and server, with event tracking, error logging, and analytics/statistics helpers.

## Status (August 2025)

- ✅ Event bus/evented logic fully extracted and modularized
- ✅ Server-side event file logic (read/write/close/load) extracted
- ✅ Client/server event emit logic and `/e` endpoint extracted
- ✅ Admin stats endpoint and client fetch utility extracted
- ✅ Analytics client helpers (iso, getData, fetchChartData, fetchData, numFormatter, dataCache) extracted
- ✅ Client/server/shared subfolders created and migration in progress
- ✅ Error tracking utilities and Express error middleware added
- ✅ Integration examples and usage documentation provided
- ✅ `.eslintrc` added to declare `Intl` as a global for linting
- ✅ Lint passes and all functionality verified
- ⏳ Migration of all helpers to client/server/shared nearly complete
- ⏳ Custom event tracking, configurable stat definitions, embeddable admin UI, and further documentation/testing are next

## Usage

### Tracking User Visits (Client)

```js
import { trackVisit } from "hearald/client/trackVisit.js";
trackVisit({ userId: "user-123" });
```

### Tracking Errors (Client)

```js
import { trackError } from "hearald/client/trackError.js";
try {
  // ...code...
} catch (err) {
  trackError(err);
}
```

### Tracking Errors (Server)

```js
import {
  trackServerError,
  errorTrackingMiddleware,
} from "hearald/server/serverTrackError.js";
app.use(errorTrackingMiddleware);
```

### Analytics Helpers

```js
import {
  iso,
  getData,
  fetchChartData,
  fetchData,
  numFormatter,
} from "hearald/shared/analyticsClientHelpers.js";
```

### Admin Stats Endpoint

The adminStatsEndpoint has been removed. For admin statistics, use the analytics router provided by hearald/server/analytics.js.
Example:

```js
import { createAnalyticsRouter } from 'hearald/server/analytics.js';
app.use('/admin/stats', createAnalyticsRouter({...}));
```

### Admin Stats Client Fetcher

```js
import { fetchAdminStats } from "hearald/client/adminStatsClient.js";
const stats = await fetchAdminStats();
```

## Roadmap

See TODO.md for next steps and roadmap.
