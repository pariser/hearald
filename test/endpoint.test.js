import test from "node:test";
import assert from "node:assert";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import hearald, { basicAuth, purgeOldEvents } from "../src/index.js";
import hearaldConfiguration from "../src/server/configuration.js";
import { readEventsFromFile, closeEventFiles } from "../src/server/serverEvents.js";
import { tempDir, listen, jsonApp } from "../harness.js";

const schema = {
  app_open: { platform: { type: "string", enum: ["web", "ios"], required: true } },
  sync_error: { platform: { type: "string", enum: ["web", "ios"], required: true }, code: { type: "string", maxLength: 32 } },
};
const nowFn = () => new Date("2026-11-02T12:00:00Z");
const post = (base, body) =>
  fetch(`${base}/e`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("the event endpoint stores valid events and quietly drops the rest", async () => {
  const eventsDir = await tempDir();
  const h = hearald({ eventsDir, nowFn, eventEndpoint: { schema }, analytics: { enabled: false } });
  const app = jsonApp();
  app.use(h.eventMiddleware);
  const server = await listen(app);
  try {
    for (const body of [
      { e: "app_open", u: "user-1", p: { platform: "ios", goal_text: "secret goal" } },
      { e: "app_open", u: "user-2", p: { platform: "nope" } },
      { e: "unknown_event", u: "user-3", p: {} },
      { e: "sync_error", u: "user-1", p: { platform: "web", code: "x".repeat(40) } },
      { e: "sync_error", u: "user-1", p: { platform: "web", code: "timeout" } },
    ]) {
      assert.strictEqual((await post(server.base, body)).status, 204, "always the same answer");
    }
    await closeEventFiles();
    const stored = await readEventsFromFile("2026-11-02");
    assert.deepStrictEqual(stored.map(({ e, u, p }) => ({ e, u, p })), [
      { e: "app_open", u: "user-1", p: { platform: "ios" } },
      { e: "sync_error", u: "user-1", p: { platform: "web", code: "timeout" } },
    ]);
    assert.ok(!JSON.stringify(stored).includes("secret goal"));
  } finally {
    await server.close();
  }
});

test("parseBody can take the user from the session instead of the request", async () => {
  const eventsDir = await tempDir();
  const h = hearald({
    eventsDir, nowFn, analytics: { enabled: false },
    eventEndpoint: { schema, parseBody: (req) => ({ e: req.body.e, u: "session-user", p: req.body.p }) },
  });
  const app = jsonApp();
  app.use(h.eventMiddleware);
  const server = await listen(app);
  try {
    await post(server.base, { e: "app_open", u: "forged", p: { platform: "web" } });
    await closeEventFiles();
    const [event] = await readEventsFromFile("2026-11-02");
    assert.strictEqual(event.u, "session-user");
  } finally {
    await server.close();
  }
});

const statDefinitions = {
  raw_metrics: { opens: { aggregator: "count", event: "app_open" } },
  computed_metrics: {},
  ui: { sections: [] },
};

test("the dashboard cannot be created without authentication", () => {
  assert.throws(() => hearald({ analytics: { statDefinitions } }), /needs an `auth` middleware/);
  assert.doesNotThrow(() => hearald({ analytics: { statDefinitions, allowUnauthenticated: true } }));
  assert.doesNotThrow(() => hearald({ analytics: { enabled: false } }));
});

test("the dashboard sits behind basic auth, and its parameters are checked", async () => {
  const eventsDir = await tempDir();
  const auth = basicAuth({ verify: (user, pass) => user === "admin" && pass === "correct horse" });
  const h = hearald({ eventsDir, nowFn, analytics: { statDefinitions, auth } });
  const app = jsonApp();
  app.use("/admin/analytics", h.analyticsMiddleware);
  const server = await listen(app);
  const basic = (user, pass) => ({ Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}` });
  const get = (path, headers) => fetch(`${server.base}/admin/analytics${path}`, { headers });
  try {
    const anon = await get("/layout");
    assert.strictEqual(anon.status, 401);
    assert.match(anon.headers.get("www-authenticate"), /^Basic realm=/);
    assert.strictEqual((await get("/data/7", basic("admin", "wrong"))).status, 401);
    assert.strictEqual((await get("/layout", basic("admin", "correct horse"))).status, 200);

    const good = basic("admin", "correct horse");
    assert.strictEqual((await get("/data/7/2026-11-01", good)).status, 200);
    assert.strictEqual((await get("/data/0", good)).status, 400);
    assert.strictEqual((await get("/data/9999", good)).status, 400);
    assert.strictEqual((await get("/data/abc", good)).status, 400);
    assert.strictEqual((await get("/data/7/not-a-date", good)).status, 400);
    assert.strictEqual((await get("/data/7/..%2F..%2Fetc%2Fpasswd", good)).status, 400);
    const files = await readdir(eventsDir);
    assert.deepStrictEqual(files, ["summary:2026-11-01:7.json"], "only the valid request wrote a cache file");
  } finally {
    await server.close();
  }
});

test("basic auth locks out an IP after repeated wrong guesses", async () => {
  let now = 0;
  const auth = basicAuth({ verify: () => false, maxFailures: 3, windowMs: 1000, now: () => now });
  const app = jsonApp();
  app.use(auth, (req, res) => res.send("in"));
  const server = await listen(app);
  const wrong = { Authorization: `Basic ${Buffer.from("a:b").toString("base64")}` };
  try {
    for (let i = 0; i < 3; i++) assert.strictEqual((await fetch(server.base, { headers: wrong })).status, 401);
    assert.strictEqual((await fetch(server.base, { headers: wrong })).status, 429);
    now = 1001;
    assert.strictEqual((await fetch(server.base, { headers: wrong })).status, 401);
  } finally {
    await server.close();
  }
});

test("purgeOldEvents removes logs and cached summaries older than the retention period", async () => {
  const eventsDir = await tempDir();
  hearaldConfiguration.setEventsDir(eventsDir);
  await mkdir(eventsDir, { recursive: true });
  for (const name of ["2026-07-01.log", "2026-07-01-visits.log", "summary:2026-07-01:7.json", "2026-10-30.log", "summary:2026-10-30:7.json", "notes.txt"]) {
    await writeFile(join(eventsDir, name), "x");
  }
  const removed = await purgeOldEvents({ days: 90, now: new Date("2026-11-02T12:00:00Z") });
  assert.strictEqual(removed, 3);
  assert.deepStrictEqual((await readdir(eventsDir)).sort(), ["2026-10-30.log", "notes.txt", "summary:2026-10-30:7.json"]);
  await assert.rejects(() => purgeOldEvents({ days: 0 }), /whole number/);
  assert.strictEqual(await purgeOldEvents({ days: 5, now: new Date() }) >= 0, true);
});

test("without a schema, junk is dropped and visits get the caller's address", async () => {
  const eventsDir = await tempDir();
  const h = hearald({ eventsDir, nowFn, analytics: { enabled: false } });
  const app = jsonApp();
  app.use(h.eventMiddleware);
  const server = await listen(app);
  try {
    for (const body of [{}, { e: "" }, { e: 5 }, { e: "ok", u: "u", p: "not an object" }, { e: "ok", p: [1, 2] }, { e: "visit", p: { url: "/" } }]) {
      assert.strictEqual((await post(server.base, body)).status, 204);
    }
    await closeEventFiles();
    const events = await readEventsFromFile("2026-11-02");
    assert.deepStrictEqual(events.map((e) => [e.e, e.p]), [["ok", {}], ["ok", {}]]);
    const visits = await readEventsFromFile("2026-11-02-visits");
    assert.strictEqual(visits.length, 1);
    assert.match(visits[0].p.ip, /127\.0\.0\.1|::1/);
  } finally {
    await server.close();
  }
});

test("a request with no body at all is quietly ignored", async () => {
  const h = hearald({ eventsDir: await tempDir(), nowFn, analytics: { enabled: false } });
  const app = jsonApp();
  app.use(h.eventMiddleware);
  const server = await listen(app);
  try {
    assert.strictEqual((await fetch(`${server.base}/e`, { method: "POST" })).status, 204);
  } finally {
    await server.close();
  }
});
