// Analytics router and helpers for hearald
import chalk from "chalk";
import path from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { readFile, writeFile, mkdir } from "fs/promises";
import express from "express";
import log from "./logger.js";
import hearaldConfiguration from "./configuration.js";
import { omitProperties, defaultEndDate, iso } from "../shared/utils.js";
import { loadEventsOverWindow, windowBytes } from "./serverEvents.js";
import { asyncHandler } from "./asyncHandler.js";

const MAX_TIME_WINDOW_DAYS = 366;

// Bump when the way numbers are computed or stored changes, so summaries cached by an older version
// are not served.
const CACHE_FORMAT_VERSION = 1;

// Thrown when a window's event files are bigger than the memory budget.
export class WindowTooLargeError extends Error {
  constructor(bytes, limit) {
    super(`window too large (${bytes} bytes of events, the limit is ${limit})`);
    this.name = "WindowTooLargeError";
  }
}

// Computing stats holds a whole window of events in memory, so run one computation at a time: with
// several at once, memory use multiplies.
let queue = Promise.resolve();
export function runExclusive(task) {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
}

// A histogram value is a string, number or boolean. 0, false and "" are real values.
const histogramValue = (params, field) => {
  const value = params ? params[field] : undefined;
  return ["string", "number", "boolean"].includes(typeof value) ? value : null;
};

export function generateRawMetrics(events, rawMetricDefinitions) {
  const metrics = {};
  Object.entries(rawMetricDefinitions).forEach(
    ([name, rawMetricDefinition]) => {
      if (rawMetricDefinition.aggregator === "count") {
        metrics[name] = 0;
      } else if (rawMetricDefinition.aggregator === "set_of_users") {
        metrics[name] = new Set();
      } else if (rawMetricDefinition.aggregator === "histogram") {
        // no prototype, so a value named "constructor" or "__proto__" is just a key
        metrics[name] = Object.create(null);
      }
    }
  );

  events.forEach(({ e, p: eventParams, u }) => {
    const p = eventParams || {};
    Object.entries(rawMetricDefinitions).forEach(
      ([name, rawMetricDefinition]) => {
        if (rawMetricDefinition.filter) {
          const match = Object.entries(rawMetricDefinition.filter).every(
            ([filterField, filterValue]) => p[filterField] === filterValue
          );
          if (!match) return;
        }
        // A set_of_users metric that names an event counts only users who sent that event.
        if (
          rawMetricDefinition.aggregator === "set_of_users" &&
          rawMetricDefinition.event &&
          rawMetricDefinition.event !== e
        ) {
          return;
        }
        if (
          rawMetricDefinition.aggregator === "count" &&
          rawMetricDefinition.event === e
        ) {
          metrics[name] += 1;
        } else if (rawMetricDefinition.aggregator === "set_of_users") {
          if (u !== null && u !== undefined) metrics[name].add(u);
        } else if (
          rawMetricDefinition.aggregator === "histogram" &&
          rawMetricDefinition.event === e
        ) {
          const value = histogramValue(p, rawMetricDefinition.field);
          if (value !== null) {
            metrics[name][value] = (metrics[name][value] || 0) + 1;
          }
        }
      }
    );
  });
  // Convert histogram objects to sorted list of [label, count] tuples
  Object.entries(rawMetricDefinitions).forEach(([name, def]) => {
    if (def.aggregator === "histogram") {
      const hist = metrics[name];
      metrics[name] = Object.entries(hist).sort((a, b) => b[1] - a[1]);
    }
  });
  return metrics;
}

export function generateComputedMetric(metrics, definition, timeWindow) {
  const set = new Set();
  let denominator;
  switch (definition.formula) {
    case "set_difference":
      (metrics[definition.metrics.at(0)] || new Set()).forEach((v) =>
        set.add(v)
      );
      definition.metrics.slice(1).forEach((metricName) => {
        (metrics[metricName] || new Set()).forEach((v) => set.delete(v));
      });
      return set;
    case "set_count":
      return (metrics[definition.metrics.at(0)] || new Set()).size;
    case "percent":
      denominator = metrics[definition.metrics.at(1)];
      if (!denominator) {
        return 0;
      }
      return (100 * (metrics[definition.metrics.at(0)] || 0)) / denominator;
    case "rate_time_window":
      return (metrics[definition.metrics.at(0)] || 0) / timeWindow;
    case "histogram": {
      // Compute histogram for given event type and field
      const sourceEvent = definition.source;
      const field = definition.field;
      const histogram = Object.create(null);
      // Find all events of the given type
      (metrics._allEvents || []).forEach((ev) => {
        const value = ev.e === sourceEvent ? histogramValue(ev.p, field) : null;
        if (value !== null) {
          histogram[value] = (histogram[value] || 0) + 1;
        }
      });
      // back to a plain object (fromEntries keeps a "__proto__" key as an ordinary key)
      return Object.fromEntries(Object.entries(histogram));
    }
    default:
      throw new Error(`hearald: unknown formula "${definition.formula}"`);
  }
}

// A short fingerprint of what the numbers depend on: the metric definitions (not `ui`) and the
// format version. Changing a definition must not serve summaries computed with the old one.
export function cacheKey(statDefinitions) {
  return createHash("sha1")
    .update(
      JSON.stringify([
        CACHE_FORMAT_VERSION,
        statDefinitions.raw_metrics,
        statDefinitions.computed_metrics,
      ])
    )
    .digest("hex")
    .slice(0, 8);
}

export function cacheFilePath(endDate, timeWindow, statDefinitions) {
  const endDateIso =
    typeof endDate === "string" ? endDate : hearaldConfiguration.isoFn(endDate);
  return path.join(
    hearaldConfiguration.eventsDir,
    `summary:${endDateIso}:${timeWindow}:${cacheKey(statDefinitions)}.json`
  );
}

export async function readMetricsFromCache(
  endDateIso,
  timeWindow,
  statDefinitions
) {
  const filePath = cacheFilePath(endDateIso, timeWindow, statDefinitions);
  try {
    return (await readFile(filePath)).toString("utf8");
  } catch (e) {
    if (e.code === "ENOENT") {
      return null;
    }
    throw e;
  }
}

export async function writeMetricsToCache(
  endDateIso,
  timeWindow,
  statsJson,
  statDefinitions
) {
  const filePath = cacheFilePath(endDateIso, timeWindow, statDefinitions);
  await mkdir(hearaldConfiguration.eventsDir, { recursive: true });
  return writeFile(filePath, statsJson);
}

export async function generateStats(statDefinitions, endDate, timeWindow) {
  const rawMetricDefinitions = statDefinitions.raw_metrics;
  const computedMetricDefinitions = statDefinitions.computed_metrics;

  // Collect all file suffixes needed for metrics (from raw metrics now)
  const fileSuffixes = new Set([""]); // default log file
  Object.values(rawMetricDefinitions).forEach((def) => {
    if (def.source_file_suffix) fileSuffixes.add(def.source_file_suffix);
  });

  // Refuse a window too big for memory before reading any of it
  let bytes = 0;
  for (const suffix of fileSuffixes) {
    bytes += await windowBytes(endDate, timeWindow, suffix || undefined);
  }
  if (bytes > hearaldConfiguration.maxWindowBytes) {
    throw new WindowTooLargeError(bytes, hearaldConfiguration.maxWindowBytes);
  }

  // Load events from all relevant files for raw metrics
  let processedEventCount = 0;
  const eventsBySuffix = {};
  for (const suffix of fileSuffixes) {
    const events = await loadEventsOverWindow(
      endDate,
      timeWindow,
      suffix || undefined
    );
    processedEventCount += events.length;
    eventsBySuffix[suffix || ""] = events;
  }

  // Generate raw metrics, using correct event set for each metric
  const metrics = {};
  Object.entries(rawMetricDefinitions).forEach(([name, def]) => {
    const suffix = def.source_file_suffix || "";
    metrics[name] = generateRawMetrics(eventsBySuffix[suffix], { [name]: def })[
      name
    ];
  });

  // Only a computed histogram reads the raw events, so only then keep them all together
  if (
    Object.values(computedMetricDefinitions).some(
      (def) => def.formula === "histogram"
    )
  ) {
    const allEvents = [];
    for (const events of Object.values(eventsBySuffix)) {
      for (const event of events) allEvents.push(event);
    }
    metrics._allEvents = allEvents;
  }

  let anyComputed = true;
  while (anyComputed) {
    anyComputed = false;
    for (const [name, computedMetricDefinition] of Object.entries(
      computedMetricDefinitions
    )) {
      if (typeof metrics[name] !== "undefined") {
        continue;
      }
      if (
        computedMetricDefinition.metrics &&
        computedMetricDefinition.metrics.every(
          (m) => typeof metrics[m] !== "undefined"
        )
      ) {
        metrics[name] = generateComputedMetric(
          metrics,
          computedMetricDefinition,
          timeWindow
        );
        anyComputed = typeof metrics[name] !== "undefined";
      }
    }
  }
  const hiddenMetrics = []
    .concat(
      Object.keys(rawMetricDefinitions).filter(
        (k) => rawMetricDefinitions[k].hidden
      )
    )
    .concat(
      Object.keys(computedMetricDefinitions).filter(
        (k) => computedMetricDefinitions[k].hidden
      )
    );
  const flatMetrics = omitProperties(metrics, ...hiddenMetrics, "_allEvents");
  const nestedMetrics = {};
  Object.entries(flatMetrics).forEach(([metricName, metricValue]) => {
    const metricNameParts = metricName.split(".");
    let m = nestedMetrics;
    while (metricNameParts.length > 1) {
      const metricNamePart = metricNameParts.shift();
      if (typeof m[metricNamePart] === "undefined") {
        m[metricNamePart] = {};
      }
      m = m[metricNamePart];
    }
    m[metricNameParts[0]] = metricValue;
  });
  return {
    metrics: nestedMetrics,
    endDate: hearaldConfiguration.isoFn(endDate),
    timeWindow,
    processedEventCount,
  };
}

export async function handleAnalyticsDataRequest({
  request,
  response,
  statDefinitions,
}) {
  const defaultEndDateIso = hearaldConfiguration.isoFn(
    defaultEndDate(hearaldConfiguration.nowFn())
  );
  const endDateIso = request.params.date
    ? request.params.date
    : defaultEndDateIso;
  // The date becomes part of a file name, so it must be a real calendar date and nothing else. The
  // round trip rejects dates like 2026-02-31, which Date would quietly move to March.
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(endDateIso) ||
    Number.isNaN(new Date(`${endDateIso}T00:00:00Z`).getTime()) ||
    iso(new Date(`${endDateIso}T00:00:00Z`)) !== endDateIso
  ) {
    response.status(400).json({ error: "invalid date" });
    return;
  }
  const timeWindow = /^\d+$/.test(String(request.params.last))
    ? parseInt(request.params.last, 10)
    : 0;
  if (!timeWindow || timeWindow > MAX_TIME_WINDOW_DAYS) {
    response.status(400).json({ error: "invalid time window" });
    return;
  }
  // A window that ends today (or later) is still filling up, so it is never cached.
  const cacheable =
    endDateIso < hearaldConfiguration.isoFn(hearaldConfiguration.nowFn());
  const sendCached = (json) => {
    log.info(
      `Analytics for ${timeWindow} days ending on ${endDateIso} returned from cache`
    );
    response.status(200).type("application/json").send(json);
  };
  const dataFromFile = cacheable
    ? await readMetricsFromCache(endDateIso, timeWindow, statDefinitions)
    : null;
  if (dataFromFile) {
    sendCached(dataFromFile);
    return;
  }
  try {
    const stats = await runExclusive(async () => {
      // someone ahead of us in the queue may just have computed this same window
      const cached = cacheable
        ? await readMetricsFromCache(endDateIso, timeWindow, statDefinitions)
        : null;
      if (cached) return { cached };
      log.info(
        `Analytics for ${timeWindow} days ending on ${endDateIso} computing from events`
      );
      const computed = await generateStats(
        statDefinitions,
        new Date(`${endDateIso}T00:00:00Z`),
        timeWindow
      );
      if (cacheable) {
        await writeMetricsToCache(
          endDateIso,
          timeWindow,
          JSON.stringify(computed, null, 2),
          statDefinitions
        );
      }
      return { computed };
    });
    if (stats.cached) {
      sendCached(stats.cached);
      return;
    }
    response.status(200).type("application/json").send(JSON.stringify(stats.computed));
  } catch (e) {
    if (e instanceof WindowTooLargeError) {
      log.warn(e.message);
      response.status(413).json({ error: "window too large" });
      return;
    }
    log.error("failed to compute analytics", e);
    response
      .status(500)
      .type("application/json")
      .send(JSON.stringify({ error: e.message }));
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

log.info("filename is", __filename);
log.info("dirname is", __dirname);

/**
 * @param {Object} options
 * @param {Object} options.statDefinitions
 * @param {function} options.auth - Express middleware that rejects anyone who may not see the stats
 *   (for example basicAuth from hearald). Required: the dashboard shows your usage numbers.
 * @param {boolean} [options.allowUnauthenticated=false] - Skip `auth`. Only for local development.
 */
export function createAnalyticsRouter({
  statDefinitions,
  auth,
  allowUnauthenticated = false,
}) {
  if (typeof auth !== "function" && !allowUnauthenticated) {
    throw new Error(
      "hearald: the analytics dashboard needs an `auth` middleware (see basicAuth), " +
        "or allowUnauthenticated: true for local development"
    );
  }
  log.info("statManifest", statDefinitions);
  const router = express.Router();
  if (typeof auth === "function") router.use(auth);

  // Two routes rather than an optional `:date?`, which Express 5 (path-to-regexp 8) rejects.
  // asyncHandler sends a failed read to the error handler; Express 4 would crash on it.
  router.get(
    ["/data/:last", "/data/:last/:date"],
    asyncHandler(async (request, response) => {
      log.info(chalk.cyan("[API] GET /analytics/data/:last/:date?"));
      await handleAnalyticsDataRequest({
        request,
        response,
        statDefinitions,
      });
    })
  );

  router.get(`/layout`, (req, res) => {
    res.json(statDefinitions.ui || {});
  });

  router.get(
    `/`,
    asyncHandler(async (request, response) => {
      const fileContents = await readFile(
        path.join(__dirname, "..", "..", "dist", "analytics.html")
      );
      const analyticsHtml = fileContents.toString("utf-8");
      response.send(analyticsHtml);
    })
  );

  return router;
}
