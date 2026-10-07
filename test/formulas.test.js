import test from "node:test";
import assert from "node:assert";
import { generateComputedMetric, generateRawMetrics, generateStats } from "../src/server/analytics.js";
import hearaldConfiguration from "../src/server/configuration.js";
import { closeEventFiles, writeEvent } from "../src/server/serverEvents.js";
import { tempDir } from "../harness.js";

test("set formulas", () => {
  const metrics = { a: new Set(["1", "2", "3"]), b: new Set(["2"]), c: new Set(["3", "9"]) };
  assert.deepStrictEqual([...generateComputedMetric(metrics, { formula: "set_difference", metrics: ["a", "b", "c"] })], ["1"]);
  assert.deepStrictEqual([...generateComputedMetric(metrics, { formula: "set_difference", metrics: ["a"] })].sort(), ["1", "2", "3"]);
  assert.strictEqual(generateComputedMetric(metrics, { formula: "set_count", metrics: ["a"] }), 3);
  assert.strictEqual(generateComputedMetric(metrics, { formula: "set_count", metrics: ["missing"] }), 0);
  assert.deepStrictEqual(metrics.a, new Set(["1", "2", "3"]), "the inputs are not changed");
});

test("percent and rate formulas", () => {
  assert.strictEqual(generateComputedMetric({ n: 25, d: 200 }, { formula: "percent", metrics: ["n", "d"] }), 12.5);
  assert.strictEqual(generateComputedMetric({ n: 5, d: 0 }, { formula: "percent", metrics: ["n", "d"] }), 0, "no division by zero");
  assert.strictEqual(generateComputedMetric({ n: 5 }, { formula: "percent", metrics: ["n", "d"] }), 0);
  assert.strictEqual(generateComputedMetric({ n: 70 }, { formula: "rate_time_window", metrics: ["n"] }, 7), 10);
});

test("the histogram formula counts a field across one event type", () => {
  const metrics = { _allEvents: [
    { e: "sync_error", p: { code: "timeout" } }, { e: "sync_error", p: { code: "timeout" } },
    { e: "sync_error", p: { code: "offline" } }, { e: "sync_error", p: {} }, { e: "app_open", p: { code: "x" } },
  ] };
  assert.deepStrictEqual(generateComputedMetric(metrics, { formula: "histogram", source: "sync_error", field: "code" }), { timeout: 2, offline: 1 });
});

test("an unknown formula is an error, not a silent hang", () => {
  assert.throws(() => generateComputedMetric({}, { formula: "median", metrics: [] }), /unknown formula "median"/);
});

test("raw histograms are sorted by count, and counts only count the named event", () => {
  const events = [
    { e: "completion_added", p: { goal_type: "binary" } }, { e: "completion_added", p: { goal_type: "counter" } },
    { e: "completion_added", p: { goal_type: "counter" } }, { e: "app_open", p: { goal_type: "binary" } },
    { e: "completion_added", p: {} },
  ];
  const metrics = generateRawMetrics(events, {
    by_type: { aggregator: "histogram", event: "completion_added", field: "goal_type" },
    total: { aggregator: "count", event: "completion_added" },
  });
  assert.deepStrictEqual(metrics.by_type, [["counter", 2], ["binary", 1]]);
  assert.strictEqual(metrics.total, 4);
});

test("generateStats: dependencies resolve in any order, hidden metrics are left out, names nest", async () => {
  hearaldConfiguration.setEventsDir(await tempDir());
  const day = new Date("2026-11-02T12:00:00Z");
  for (const u of ["a", "b", "c"]) await writeEvent(day, { e: "app_open", u, p: { platform: "web" } });
  await writeEvent(day, { e: "purchase", u: "a", p: {} });
  await closeEventFiles();
  const stats = await generateStats(
    {
      raw_metrics: {
        "users.all": { aggregator: "set_of_users", event: "app_open", hidden: true },
        "users.buyers": { aggregator: "set_of_users", event: "purchase", hidden: true },
      },
      computed_metrics: {
        "conversion.percent": { formula: "percent", metrics: ["buyer_count", "user_count"] },
        buyer_count: { formula: "set_count", metrics: ["users.buyers"], hidden: true },
        user_count: { formula: "set_count", metrics: ["users.all"] },
      },
    },
    day,
    1
  );
  assert.strictEqual(stats.metrics.user_count, 3);
  assert.ok(Math.abs(stats.metrics.conversion.percent - 33.333) < 0.01);
  assert.strictEqual(stats.metrics.buyer_count, undefined, "hidden");
  assert.strictEqual(stats.metrics.users, undefined, "hidden raw metrics are not shown either");
});

test("generateStats stops on an unknown formula and on a metric that can never be computed", async () => {
  hearaldConfiguration.setEventsDir(await tempDir());
  const day = new Date("2026-11-02T12:00:00Z");
  await assert.rejects(
    generateStats({ raw_metrics: {}, computed_metrics: { x: { formula: "nope", metrics: [] } } }, day, 1),
    /unknown formula/
  );
  const stats = await generateStats({ raw_metrics: {}, computed_metrics: { orphan: { formula: "set_count", metrics: ["does.not.exist"] } } }, day, 1);
  assert.strictEqual(stats.metrics.orphan, undefined);
});

test("a metric can read the visits file instead of the main log", async () => {
  hearaldConfiguration.setEventsDir(await tempDir());
  const day = new Date("2026-11-02T12:00:00Z");
  await writeEvent(day, { e: "visit", u: "v1", p: {} });
  await writeEvent(day, { e: "visit", u: "v2", p: {} });
  await writeEvent(day, { e: "app_open", u: "o1", p: {} });
  await closeEventFiles();
  const stats = await generateStats(
    { raw_metrics: { visits: { aggregator: "count", event: "visit", source_file_suffix: "visits" }, opens: { aggregator: "count", event: "app_open" } }, computed_metrics: {} },
    day,
    1
  );
  assert.deepStrictEqual([stats.metrics.visits, stats.metrics.opens, stats.processedEventCount], [2, 1, 3]);
});
