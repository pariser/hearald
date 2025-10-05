// Analytics router and helpers for hearald
import chalk from "chalk";
import path from "path";
import { fileURLToPath } from "url";
import { readFile, writeFile } from "fs/promises";
import express from "express";
import log from "./logger.js";
import hearaldConfiguration from "./configuration.js";
import { omitProperties, defaultEndDate } from "../shared/utils.js";
import { loadEventsOverWindow } from "./serverEvents.js";

export function generateRawMetrics(events, rawMetricDefinitions) {
  const metrics = {};
  Object.entries(rawMetricDefinitions).forEach(
    ([name, rawMetricDefinition]) => {
      if (rawMetricDefinition.aggregator === "count") {
        metrics[name] = 0;
      } else if (rawMetricDefinition.aggregator === "set_of_users") {
        metrics[name] = new Set();
      } else if (rawMetricDefinition.aggregator === "histogram") {
        metrics[name] = {};
      }
    }
  );

  events.forEach(({ e, p, u }) => {
    Object.entries(rawMetricDefinitions).forEach(
      ([name, rawMetricDefinition]) => {
        if (rawMetricDefinition.filter) {
          const match = Object.entries(rawMetricDefinition.filter).every(
            ([filterField, filterValue]) => p[filterField] === filterValue
          );
          if (!match) return;
        }
        if (
          rawMetricDefinition.aggregator === "count" &&
          rawMetricDefinition.event === e
        ) {
          metrics[name] += 1;
        } else if (rawMetricDefinition.aggregator === "set_of_users") {
          metrics[name].add(u);
        } else if (
          rawMetricDefinition.aggregator === "histogram" &&
          rawMetricDefinition.event === e
        ) {
          const field = rawMetricDefinition.field;
          const value = p && p[field] ? p[field] : null;
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
      const histogram = {};
      // Find all events of the given type
      (metrics._allEvents || []).forEach((ev) => {
        if (ev.e === sourceEvent && ev.p && ev.p[field]) {
          const value = ev.p[field];
          histogram[value] = (histogram[value] || 0) + 1;
        }
      });
      return histogram;
    }
  }
}

export function cacheFilePath(endDate, timeWindow) {
  const endDateIso =
    typeof endDate === "string" ? endDate : hearaldConfiguration.isoFn(endDate);
  return `events/summary:${endDateIso}:${timeWindow}.json`;
}

export async function readMetricsFromCache(endDateIso, timeWindow) {
  const filePath = cacheFilePath(endDateIso, timeWindow);
  try {
    return (await readFile(filePath)).toString("utf8");
  } catch (e) {
    if (e.message.indexOf("ENOENT") !== -1) {
      return null;
    }
    throw e;
  }
}

export async function writeMetricsToCache(endDateIso, timeWindow, statsJson) {
  const filePath = cacheFilePath(endDateIso, timeWindow);
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

  // Load events from all relevant files for raw metrics
  let allEvents = [];
  const eventsBySuffix = {};
  for (const suffix of fileSuffixes) {
    const events = await loadEventsOverWindow(
      endDate,
      timeWindow,
      suffix || undefined
    );
    allEvents = allEvents.concat(events);
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

  // Store all events for computed metrics
  metrics._allEvents = allEvents;

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
        anyComputed = true;
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
    processedEventCount: allEvents.length,
  };
}

export async function handleAnalyticsDataRequest({
  request,
  response,
  statDefinitions,
}) {
  const defaultEndDateIso = hearaldConfiguration.isoFn(defaultEndDate());
  const endDateIso = request.params.date
    ? request.params.date
    : defaultEndDateIso;
  const timeWindow = parseInt(request.params.last, 10);
  if (!timeWindow) {
    response.status(500).json({ Error: "invalid time window" });
    return;
  }
  const dataFromFile = await readMetricsFromCache(endDateIso, timeWindow);
  if (dataFromFile) {
    log.info(
      `Analytics for ${timeWindow} days ending on ${endDateIso} returned from cache`
    );
    response.status(200).type("application/json").send(dataFromFile);
    return;
  }
  log.info(
    `Analytics for ${timeWindow} days ending on ${endDateIso} computing from events`
  );
  try {
    const stats = await generateStats(
      statDefinitions,
      new Date(endDateIso),
      timeWindow
    );
    await writeMetricsToCache(
      endDateIso,
      timeWindow,
      JSON.stringify(stats, null, 2)
    );
    response.status(200).type("application/json").send(JSON.stringify(stats));
  } catch (e) {
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

export function createAnalyticsRouter({ statDefinitions }) {
  log.info("statManifest", statDefinitions);
  const router = express.Router();

  router.get(`/data/:last/:date?`, async (request, response) => {
    log.info(chalk.cyan("[API] GET /analytics/data/:last/:date?"));
    await handleAnalyticsDataRequest({
      request,
      response,
      statDefinitions,
      loadEventsOverWindow,
    });
  });

  router.get(`/layout`, async (req, res) => {
    res.json(statDefinitions.ui || {});
  });

  router.get(`/`, async (request, response) => {
    const fileContents = await readFile(
      path.join(__dirname, "..", "..", "dist", "analytics.html")
    );
    const analyticsHtml = fileContents.toString("utf-8");
    response.send(analyticsHtml);
  });

  return router;
}
