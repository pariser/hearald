# hearald

A single server drop-in file system based metrics and analytics library.

## TODO

- top stats histogram should/could be it's own ui-configurable data type
- top stats histogram fields should be controlled in the ui configuration settings

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

### Locking down the endpoints

```js
import hearald, { basicAuth } from "hearald";

const h = hearald({
  eventsDir: "/var/lib/myapp/events",
  // Only these events and parameters are accepted; everything else is dropped.
  eventEndpoint: {
    schema: { app_open: { platform: { type: "string", enum: ["web", "ios"], required: true } } },
  },
  // The dashboard needs auth. verify() should compare against a stored hash, in constant time.
  analytics: { statDefinitions, auth: basicAuth({ verify: (user, pass) => ok(user, pass) }) },
});
app.use("/events", h.eventMiddleware);
app.use("/admin/analytics", h.analyticsMiddleware);
await h.purgeOldEvents({ days: 90 }); // run nightly
```

A `set_of_users` metric can name an `event` and a `filter` on parameters, for example web users who
opened the app: `{ aggregator: "set_of_users", event: "app_open", filter: { platform: "web" } }`.

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
