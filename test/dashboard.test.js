import test from "node:test";
import assert from "node:assert";
import { mkdir, readdir, writeFile } from "fs/promises";
import { join } from "path";
import hearald from "../src/index.js";
import hearaldConfiguration from "../src/server/configuration.js";
import { generateRawMetrics, generateComputedMetric, runExclusive } from "../src/server/analytics.js";
import { closeEventFiles, writeEvent } from "../src/server/serverEvents.js";
import { tempDir, sleep, listen, jsonApp, captureErrorLog, watchUnhandledRejections } from "../harness.js";

const statDefinitions = {
  raw_metrics: { opens: { aggregator: "count", event: "app_open" } },
  computed_metrics: {},
  ui: { sections: [] },
};
const NOW = "2026-11-10T12:00:00Z";

async function setup({ definitions = statDefinitions, nowIso = NOW, ...options } = {}) {
  const eventsDir = await tempDir();
  const h = hearald({ eventsDir, nowFn: () => new Date(nowIso), analytics: { statDefinitions: definitions, allowUnauthenticated: true }, ...options });
  const app = jsonApp();
  app.use("/analytics", h.analyticsMiddleware);
  app.use((err, req, res, next) => res.status(500).json({ handled: err.code || err.message })); // eslint-disable-line no-unused-vars
  const server = await listen(app);
  return { eventsDir, server, get: (path) => fetch(`${server.base}/analytics${path}`).then(async (r) => {
    const text = await r.text();
    try {
      return { status: r.status, body: JSON.parse(text) };
    } catch (e) {
      return { status: r.status, body: text }; // for example the HTML of a 404
    }
  }) };
}

test("both forms of the data route work: with and without an end date", async () => {
  // Express 5 refuses a route with an optional `:date?`, so hearald registers two routes
  const { server, get } = await setup();
  try {
    await writeEvent(new Date("2026-11-09T12:00:00Z"), { e: "app_open", u: "a", p: {} });
    await closeEventFiles();
    const withoutDate = await get("/data/7");
    assert.strictEqual(withoutDate.status, 200);
    assert.strictEqual(withoutDate.body.endDate, "2026-11-09");
    const withDate = await get("/data/7/2026-11-09");
    assert.strictEqual(withDate.status, 200);
    assert.strictEqual(withDate.body.metrics.opens, 1);
    assert.strictEqual((await get("/data")).status, 404);
    assert.strictEqual((await get("/data/7/2026-11-09/extra")).status, 404);
  } finally {
    await server.close();
  }
});

test("impossible calendar dates are refused, real ones (leap day, month ends) are accepted", async () => {
  const { eventsDir, server, get } = await setup();
  try {
    for (const bad of ["2026-02-31", "2026-02-29", "2026-04-31", "2026-06-31", "2026-00-10", "2026-13-01", "2026-01-00", "2026-01-32", "2100-02-29"]) {
      assert.strictEqual((await get(`/data/1/${bad}`)).status, 400, bad);
    }
    for (const good of ["2028-02-29", "2026-02-28", "2026-01-31", "2026-04-30", "2026-12-31", "2000-02-29"]) {
      const res = await get(`/data/1/${good}`);
      assert.strictEqual(res.status, 200, good);
      assert.strictEqual(res.body.endDate, good, "answers for the day that was asked for");
    }
    assert.ok(!(await readdir(eventsDir)).some((f) => f.includes("02-31") || f.includes("04-31")), "no cache file for an impossible date");
  } finally {
    await server.close();
  }
});

test("a date must be exactly YYYY-MM-DD", async () => {
  const { server, get } = await setup();
  try {
    for (const bad of ["x2026-11-01", "2026-11-01x", "2026-11-1", "02026-11-01", "2026-11-01%20", "2026%2F11%2F01", "2026-11-01T00:00:00Z"]) {
      assert.strictEqual((await get(`/data/1/${bad}`)).status, 400, bad);
    }
  } finally {
    await server.close();
  }
});

test("a window with more event data than the budget is refused with 413", async () => {
  const { server, get } = await setup({ maxWindowBytes: 200 });
  try {
    for (let i = 0; i < 10; i++) await writeEvent(new Date("2026-11-08T12:00:00Z"), { e: "app_open", u: `user-${i}`, p: {} });
    await closeEventFiles();
    const tooBig = await get("/data/3/2026-11-09");
    assert.strictEqual(tooBig.status, 413);
    assert.deepStrictEqual(tooBig.body, { error: "window too large" });
    // a window that does not reach the big day fits
    assert.strictEqual((await get("/data/1/2026-11-09")).status, 200);
  } finally {
    hearaldConfiguration.setMaxWindowBytes(64 * 1024 * 1024);
    await server.close();
  }
});

test("the default budget is 64 MB and the idle delay a minute", () => {
  assert.strictEqual(hearaldConfiguration.maxWindowBytes, 64 * 1024 * 1024);
  assert.strictEqual(hearaldConfiguration.idleCloseMs, 60 * 1000);
});

test("stats computations run one at a time, in order, and a failure does not block the queue", async () => {
  let active = 0;
  let maxActive = 0;
  const order = [];
  const task = (name, { fail = false } = {}) => async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await sleep(10);
    order.push(name);
    active -= 1;
    if (fail) throw new Error(name);
    return name;
  };
  const results = await Promise.allSettled([
    runExclusive(task("a")), runExclusive(task("b", { fail: true })), runExclusive(task("c")), runExclusive(task("d")),
  ]);
  assert.strictEqual(maxActive, 1);
  assert.deepStrictEqual(order, ["a", "b", "c", "d"]);
  assert.deepStrictEqual(results.map((r) => r.status), ["fulfilled", "rejected", "fulfilled", "fulfilled"]);
});

test("simultaneous requests for the same finished window all get the answer", async () => {
  const { eventsDir, server, get } = await setup();
  try {
    await writeEvent(new Date("2026-11-01T12:00:00Z"), { e: "app_open", u: "a", p: {} });
    await closeEventFiles();
    const answers = await Promise.all(Array.from({ length: 5 }, () => get("/data/1/2026-11-01")));
    assert.deepStrictEqual(answers.map((a) => a.body.metrics.opens), [1, 1, 1, 1, 1]);
    assert.strictEqual((await readdir(eventsDir)).filter((f) => f.startsWith("summary")).length, 1);
  } finally {
    await server.close();
  }
});

test("changing the stat definitions does not serve summaries cached under the old ones", async () => {
  const eventsDir = await tempDir();
  const events = [{ e: "app_open", u: "a", p: {} }, { e: "app_open", u: "b", p: {} }, { e: "sync_error", u: "a", p: {} }];
  hearaldConfiguration.setEventsDir(eventsDir);
  for (const ev of events) await writeEvent(new Date("2026-11-01T12:00:00Z"), ev);
  await closeEventFiles();
  const ask = async (definitions) => {
    const h = hearald({ eventsDir, nowFn: () => new Date(NOW), analytics: { statDefinitions: definitions, allowUnauthenticated: true } });
    const app = jsonApp();
    app.use(h.analyticsMiddleware);
    const server = await listen(app);
    try {
      return await (await fetch(`${server.base}/data/1/2026-11-01`)).json();
    } finally {
      await server.close();
    }
  };
  const first = await ask({ raw_metrics: { n: { aggregator: "count", event: "app_open" } }, computed_metrics: {} });
  assert.strictEqual(first.metrics.n, 2);
  const second = await ask({ raw_metrics: { n: { aggregator: "count", event: "sync_error" } }, computed_metrics: {} });
  assert.strictEqual(second.metrics.n, 1, "computed again with the new definition");
  const again = await ask({ raw_metrics: { n: { aggregator: "count", event: "app_open" } }, computed_metrics: {}, ui: { changed: true } });
  assert.strictEqual(again.metrics.n, 2);
  assert.strictEqual((await readdir(eventsDir)).filter((f) => f.startsWith("summary")).length, 2, "one summary per distinct definition; `ui` does not matter");
});

test("a cache file that cannot be read gives the app's error handler a chance, not a crash", async () => {
  const watcher = watchUnhandledRejections();
  const { eventsDir, server, get } = await setup();
  try {
    // a directory where the summary file should be: reading it fails with EISDIR (like EACCES)
    const { cacheFilePath } = await import("../src/server/analytics.js");
    await mkdir(cacheFilePath("2026-11-01", 1, statDefinitions), { recursive: true });
    const res = await get("/data/1/2026-11-01");
    assert.strictEqual(res.status, 500);
    assert.deepStrictEqual(res.body, { handled: "EISDIR" });
    await sleep(20);
    assert.deepStrictEqual(watcher.seen, []);
    assert.ok(eventsDir);
  } finally {
    watcher.stop();
    await server.close();
  }
});

test("a numeric window parameter that is not a whole number is refused", async () => {
  const { server, get } = await setup();
  try {
    for (const bad of ["1e3", "0x10", "+5", "5.0", "Infinity", "%205"]) {
      assert.strictEqual((await get(`/data/${bad}`)).status, 400, bad);
    }
  } finally {
    await server.close();
  }
});

test("histogram values named like object internals, and 0, false and the empty string, are counted", () => {
  const values = ["constructor", "toString", "__proto__", "hasOwnProperty", 0, false, "", "normal", "normal"];
  const events = values.map((v) => ({ e: "x", p: { field: v } })).concat([{ e: "x", p: {} }, { e: "x", p: { field: null } }, { e: "x" }]);
  const raw = generateRawMetrics(events, { h: { aggregator: "histogram", event: "x", field: "field" } }).h;
  const asObject = Object.fromEntries(raw);
  assert.deepStrictEqual(raw[0], ["normal", 2], "most common first");
  assert.strictEqual(raw.length, 8);
  for (const key of ["constructor", "toString", "__proto__", "hasOwnProperty", "0", "false", ""]) {
    assert.strictEqual(asObject[key], 1, `value ${JSON.stringify(key)}`);
  }
  const computed = generateComputedMetric({ _allEvents: events }, { formula: "histogram", source: "x", field: "field" });
  assert.strictEqual(computed.normal, 2);
  for (const key of ["constructor", "toString", "hasOwnProperty", "0", "false", ""]) {
    assert.strictEqual(Object.getOwnPropertyDescriptor(computed, key)?.value, 1, `computed ${JSON.stringify(key)}`);
  }
  assert.strictEqual(Object.getOwnPropertyDescriptor(computed, "__proto__")?.value, 1);
  assert.strictEqual(JSON.parse(JSON.stringify(computed))["__proto__"], 1);
  assert.strictEqual(Object.keys(computed).length, 8);
});

test("a computed histogram sees the raw events", async () => {
  hearaldConfiguration.setEventsDir(await tempDir());
  const day = new Date("2026-11-02T12:00:00Z");
  await writeEvent(day, { e: "sync_error", u: "a", p: { code: "timeout" } });
  await writeEvent(day, { e: "sync_error", u: "b", p: { code: "timeout" } });
  await closeEventFiles();
  const { generateStats } = await import("../src/server/analytics.js");
  const stats = await generateStats(
    { raw_metrics: { errors: { aggregator: "count", event: "sync_error" } }, computed_metrics: { codes: { formula: "histogram", source: "sync_error", field: "code", metrics: ["errors"] } } },
    day, 1
  );
  assert.deepStrictEqual(stats.metrics.codes, { timeout: 2 });
  assert.strictEqual(stats.processedEventCount, 2);
  assert.ok(!("_allEvents" in stats.metrics), "the raw events are not part of the answer");
});
