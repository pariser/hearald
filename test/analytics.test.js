import test from "node:test";
import assert from "node:assert";
import { generateRawMetrics, generateStats } from "../src/server/analytics.js";
import hearaldConfiguration from "../src/server/configuration.js";
import { writeEvent, closeEventFiles } from "../src/server/serverEvents.js";
import { tempDir } from "../test-support.js";

const events = [
  { e: "app_open", u: "a", p: { platform: "web" } },
  { e: "app_open", u: "b", p: { platform: "ios" } },
  { e: "app_open", u: "a", p: { platform: "web" } },
  { e: "completion_added", u: "a", p: { platform: "web" } },
  { e: "completion_added", u: "c", p: { platform: "ios" } },
  { e: "sync_error", u: "c" }, // no params at all
];

test("set_of_users counts only users who sent the named event, with the filter applied", () => {
  const metrics = generateRawMetrics(events, {
    openers: { aggregator: "set_of_users", event: "app_open" },
    web_openers: { aggregator: "set_of_users", event: "app_open", filter: { platform: "web" } },
    ios_completers: { aggregator: "set_of_users", event: "completion_added", filter: { platform: "ios" } },
  });
  assert.deepStrictEqual([...metrics.openers].sort(), ["a", "b"]);
  assert.deepStrictEqual([...metrics.web_openers], ["a"]);
  assert.deepStrictEqual([...metrics.ios_completers], ["c"]);
});

test("a set_of_users metric with no event still counts everyone (as before)", () => {
  const metrics = generateRawMetrics(events, { everyone: { aggregator: "set_of_users" } });
  assert.deepStrictEqual([...metrics.everyone].sort(), ["a", "b", "c"]);
});

test("events without a user or params do not break counting", () => {
  const metrics = generateRawMetrics(
    [{ e: "x", p: { platform: "web" } }, { e: "x" }, { e: "x", u: null, p: null }],
    { n: { aggregator: "count", event: "x" }, who: { aggregator: "set_of_users", event: "x" }, web: { aggregator: "count", event: "x", filter: { platform: "web" } } }
  );
  assert.strictEqual(metrics.n, 3);
  assert.strictEqual(metrics.web, 1);
  assert.strictEqual(metrics.who.size, 0);
});

test("generateStats reads events from the configured directory", async () => {
  hearaldConfiguration.setEventsDir(await tempDir());
  const day = new Date("2026-11-02T12:00:00Z");
  for (const ev of events) await writeEvent(day, ev);
  await closeEventFiles();
  const stats = await generateStats(
    {
      raw_metrics: {
        "users.all": { aggregator: "set_of_users", event: "app_open" },
        "users.web": { aggregator: "set_of_users", event: "app_open", filter: { platform: "web" } },
        completions: { aggregator: "count", event: "completion_added" },
      },
      computed_metrics: {
        "users.all_count": { formula: "set_count", metrics: ["users.all"] },
        "users.web_count": { formula: "set_count", metrics: ["users.web"] },
      },
    },
    day,
    1
  );
  assert.strictEqual(stats.processedEventCount, events.length);
  assert.strictEqual(stats.metrics.completions, 2);
  assert.strictEqual(stats.metrics.users.all_count, 2);
  assert.strictEqual(stats.metrics.users.web_count, 1);
});
