# hearald

A single server drop-in file system based metrics and analytics library: your apps send events, they
are appended to one log file per day, and a small dashboard turns them into counts, unique users and
histograms. No database.

```bash
npm test      # unit and integration tests, run against Express 5 and then Express 4
npm run build # rebuilds dist/ (the dashboard page)
```

## Server

```js
import express from "express";
import hearald, { basicAuth } from "hearald";

const app = express();
app.use(express.json());

const h = hearald({
  eventsDir: "/var/lib/myapp/events", // default "events", relative to the working directory
  // idleCloseMs: 60000, // how long an event file stays open after its last write
  // maxWindowBytes: 64 * 1024 * 1024, // dashboard windows with more event data than this get a 413
  getUserId: (req) => req.user?.id, // used for server-side errors
  // Strongly recommended for any endpoint open to the internet: only these events and parameters
  // are stored, everything else is dropped (the caller still gets a 204).
  eventEndpoint: {
    url: "/events", // where the route listens, inside wherever you mount eventMiddleware (default "/e")
    schema: {
      app_open: { platform: { type: "string", enum: ["web", "ios"], required: true } },
      purchase: { plan: { type: "string", maxLength: 32 }, cents: { type: "number", integer: true, min: 0 } },
    },
    // parseBody: (req) => ({ e, u, p }), for example to take the user from a session, not the body
  },
  analytics: {
    statDefinitions, // see below
    auth: basicAuth({ verify: (user, pass) => user === "admin" && passwordMatches(pass) }),
    // allowUnauthenticated: true, // local development only
  },
});

app.use(h.eventMiddleware); // POST /events  { e, u, p }: the route's own `url`, so mount it at the root
app.use("/admin/analytics", h.analyticsMiddleware); // the dashboard
app.use(h.errorMiddlware); // records errors thrown by your routes, then passes them on

await h.trackServerEvent({ event: "job_done", userId: "system", params: { count: 3 } });
await h.trackServerError({ error: new Error("boom"), userId: "u1", extraParams: { route: "/save" } });
await h.purgeOldEvents({ days: 90 }); // run nightly to keep a retention period
await h.shutDown(); // closes open files on exit
```

The dashboard has no default password: `analytics` throws unless you pass `auth`. `basicAuth` answers 401
with a challenge and locks an IP out (429) after 10 wrong guesses in 15 minutes. Store a hash of the
password and compare in constant time.

`url` is the full path of the route (`/events` above), and `eventMiddleware` is a router that serves it, so
mount it at the root. If you mount it at `app.use("/api", h.eventMiddleware)`, events arrive at
`/api/events`, and the browser client's `endpoint` must say so.

`basicAuth` counts wrong guesses per `req.ip`. That is the visitor's address only if your app sets
Express's `trust proxy` correctly: behind a reverse proxy without it every visitor shares the proxy's
address, and with it set too loosely a caller can forge `X-Forwarded-For` to avoid the lockout. If
`verify` throws, the request gets a 500 and is not counted as a wrong guess.

**The event endpoint is public and has no rate limit or size cap of its own.** Anyone who can reach it
can send events, so fake user ids can inflate "unique users" and a flood can fill the disk. Use `schema`
(it bounds string lengths and the set of event names, not how many events arrive), keep Express's
body limit small (`express.json({ limit: "10kb" })`), and put a rate limit (for example
`express-rate-limit`) in front of it, or in your own route, as part of your hosting setup. Run `purgeOldEvents` too.

Only `express` (>= 4) is a peer dependency; use your app's own. hearald is tested on Express 4 and 5.

## Browser

```js
import hearaldClient from "hearald/client";

const h = hearaldClient({
  endpoint: "/events",
  getUserId: () => currentUserId, // used when an event does not name a user
  onError: (err, eventName) => {}, // a failed send never throws; a 404 or 500 from the server counts as failed
});

h.trackEvent({ eventName: "app_open", payload: { platform: "web" } });
h.trackVisit({ userId: "user-123" }); // adds user agent, referrer, URL and screen size
window.addEventListener("error", (error) => h.trackError({ error })); // ErrorEvent or Error
h.dispose(); // stop sending (calling hearaldClient again also replaces the previous one; an old
             // instance's dispose() only stops that instance)
```

## Stat definitions

```js
const statDefinitions = {
  raw_metrics: {
    // count events
    "opens": { aggregator: "count", event: "app_open" },
    // the set of users who sent an event, optionally only with certain parameter values
    "users.web": { aggregator: "set_of_users", event: "app_open", filter: { platform: "web" } },
    // [value, count] pairs for one parameter, most common first
    "errors.by_code": { aggregator: "histogram", event: "sync_error", field: "code" },
    // read the visits file instead of the main log
    "visits": { aggregator: "count", event: "visit", source_file_suffix: "visits" },
  },
  computed_metrics: {
    "users.web_count": { formula: "set_count", metrics: ["users.web"] },
    "users.new": { formula: "set_difference", metrics: ["users.week", "users.before"] }, // in the first, not the others
    "conversion": { formula: "percent", metrics: ["buyers", "users"] }, // first / second * 100
    "opens.per_day": { formula: "rate_time_window", metrics: ["opens"] },
  },
  ui: { sections: [{ title: "People", fields: [{ key: "users.web_count", label: "Web users", type: "number" }] }] },
};
```

Names with dots become nested objects in the result. `hidden: true` leaves a metric out of the output
(useful for sets that only feed a computed metric). A computed metric that names a formula that does
not exist is an error; one whose inputs are missing is simply left out.

## Dashboard routes

Under wherever you mounted `analyticsMiddleware`: `/` (the page), `/layout` (your `ui`), and
`/data/:days/:endDate?` (for example `/data/7/2026-11-01`: the 7 days ending that day; `endDate`
defaults to yesterday). `days` is 1 to 366 and `endDate` must be a real calendar date (`2026-02-31` is not),
otherwise 400. A window whose event files add up to more than `maxWindowBytes` (64 MB by default) is
refused with 413 `{ "error": "window too large" }`; stats are computed one request at a time, because a
window is held in memory while it is counted. Windows that end today or later are computed on every
request; finished windows are cached in `eventsDir` as `summary:<end date>:<days>:<hash>.json`, where the
hash covers your metric definitions, so changing a definition recomputes instead of serving old numbers.
Cached summaries are safe to delete at any time.

## Days and time zones

Events are bucketed into days with `nowFn` (default: the current Pacific wall-clock time, with
daylight saving) and `isoFn` (the UTC date of what `nowFn` returns). Pass `nowFn: () => new Date()` to
bucket by UTC days instead. Nothing depends on the server's own time zone.

With the default `nowFn`, the `t` stored in each event is also the Pacific wall-clock time, written with a
`Z` as if it were UTC (so noon UTC is stored as 05:00 or 04:00, and two instants an hour apart at the
November clock change get the same `t`). It is right for choosing the day, wrong as an exact instant. If
you need real instants in the logs, pass `nowFn: () => new Date()` and accept UTC days.

## Roadmap

See TODO.md.
