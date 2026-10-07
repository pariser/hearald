import test from "node:test";
import assert from "node:assert";
import { readdir } from "fs/promises";
import hearald from "../src/index.js";
import { closeEventFiles, writeEvent } from "../src/server/serverEvents.js";
import { nowAsPstDate } from "../src/shared/utils.js";
import { tempDir, listen, jsonApp } from "../harness.js";

const statDefinitions = {
  raw_metrics: { opens: { aggregator: "count", event: "app_open" } },
  computed_metrics: {},
  ui: { sections: [] },
};

async function setup(nowIso) {
  const eventsDir = await tempDir();
  const h = hearald({ eventsDir, nowFn: () => new Date(nowIso), analytics: { statDefinitions, allowUnauthenticated: true } });
  const app = jsonApp();
  app.use("/analytics", h.analyticsMiddleware);
  const server = await listen(app);
  return { eventsDir, server, get: (path) => fetch(`${server.base}/analytics${path}`).then(async (r) => ({ status: r.status, body: await r.json() })) };
}

test("a finished day is computed once, then served from the cache", async () => {
  const { eventsDir, server, get } = await setup("2026-11-10T12:00:00Z");
  try {
    await writeEvent(new Date("2026-11-01T12:00:00Z"), { e: "app_open", u: "a", p: {} });
    await closeEventFiles();
    assert.strictEqual((await get("/data/1/2026-11-01")).body.metrics.opens, 1);
    await writeEvent(new Date("2026-11-01T13:00:00Z"), { e: "app_open", u: "b", p: {} });
    await closeEventFiles();
    assert.strictEqual((await get("/data/1/2026-11-01")).body.metrics.opens, 1, "the second answer came from the cache");
    const summaries = await readdir(eventsDir).then((f) => f.filter((x) => x.startsWith("summary")));
    assert.strictEqual(summaries.length, 1);
    assert.match(summaries[0], /^summary:2026-11-01:1:[0-9a-f]{8}\.json$/);
  } finally {
    await server.close();
  }
});

test("today, and days still to come, are never cached", async () => {
  const { eventsDir, server, get } = await setup("2026-11-10T12:00:00Z");
  try {
    await writeEvent(new Date("2026-11-10T09:00:00Z"), { e: "app_open", u: "a", p: {} });
    await closeEventFiles();
    assert.strictEqual((await get("/data/1/2026-11-10")).body.metrics.opens, 1);
    await writeEvent(new Date("2026-11-10T11:00:00Z"), { e: "app_open", u: "b", p: {} });
    await closeEventFiles();
    assert.strictEqual((await get("/data/1/2026-11-10")).body.metrics.opens, 2, "today's numbers keep moving");
    assert.strictEqual((await get("/data/3/2027-01-01")).status, 200);
    assert.deepStrictEqual((await readdir(eventsDir)).filter((x) => x.startsWith("summary")), []);
  } finally {
    await server.close();
  }
});

test("with no date, the window ends yesterday by the configured clock", async () => {
  const { server, get } = await setup("2026-11-10T12:00:00Z");
  try {
    await writeEvent(new Date("2026-11-09T12:00:00Z"), { e: "app_open", u: "a", p: {} });
    await closeEventFiles();
    const res = await get("/data/1");
    assert.strictEqual(res.body.endDate, "2026-11-09");
    assert.strictEqual(res.body.metrics.opens, 1);
  } finally {
    await server.close();
  }
});

test("with the default clock, yesterday is the Pacific yesterday", async () => {
  // 03:00 UTC on Nov 10 is still the evening of Nov 9 in Pacific time, so yesterday is Nov 8
  const eventsDir = await tempDir();
  const h = hearald({ eventsDir, nowFn: () => nowAsPstDate(new Date("2026-11-10T03:00:00Z")), analytics: { statDefinitions, allowUnauthenticated: true } });
  const app = jsonApp();
  app.use("/analytics", h.analyticsMiddleware);
  const server = await listen(app);
  try {
    const res = await (await fetch(`${server.base}/analytics/data/1`)).json();
    assert.strictEqual(res.endDate, "2026-11-08");
  } finally {
    await server.close();
  }
});

test("bad parameters are a 400, not a crash or a file read", async () => {
  const { server, get } = await setup("2026-11-10T12:00:00Z");
  try {
    for (const path of ["/data/0", "/data/367", "/data/-1", "/data/1.5", "/data/x", "/data/1/2026-13-45", "/data/1/20261101", "/data/1/..%2Fsecret"]) {
      assert.strictEqual((await get(path)).status, 400, path);
    }
  } finally {
    await server.close();
  }
});
