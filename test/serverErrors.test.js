import test from "node:test";
import assert from "node:assert";
import hearald from "../src/index.js";
import { closeEventFiles, readEventsFromFile } from "../src/server/serverEvents.js";
import { tempDir, listen, jsonApp } from "../harness.js";

const nowFn = () => new Date("2026-11-02T12:00:00Z");
const readErrors = async () => {
  await closeEventFiles();
  return readEventsFromFile("2026-11-02-errors");
};

test("trackServerError records an Error, a string and an object", async () => {
  const h = hearald({ eventsDir: await tempDir(), nowFn, analytics: { enabled: false } });
  await h.trackServerError({ error: new Error("disk full"), userId: "u1", extraParams: { route: "/save" } });
  await h.trackServerError({ error: "something odd" });
  await h.trackServerError({ error: { message: "from an object", stack: "at here" } });
  await h.trackServerError({ error: { code: 7 } });
  const events = await readErrors();
  assert.deepStrictEqual(events.map((e) => e.e), ["error", "error", "error", "error"]);
  assert.strictEqual(events[0].u, "u1");
  assert.strictEqual(events[0].p.message, "disk full");
  assert.match(events[0].p.stack, /disk full/);
  assert.strictEqual(events[0].p.route, "/save");
  assert.strictEqual(events[1].p.message, "something odd");
  assert.strictEqual(events[1].u, null);
  assert.deepStrictEqual([events[2].p.message, events[2].p.stack], ["from an object", "at here"]);
  assert.strictEqual(events[3].p.message, '{"code":7}');
});

test("trackServerEvent records an event with a time and parameters", async () => {
  const h = hearald({ eventsDir: await tempDir(), nowFn, analytics: { enabled: false } });
  await h.trackServerEvent({ event: "job_done", userId: "system", params: { count: 3 } });
  await h.trackServerEvent({ event: "job_done", time: new Date("2026-11-01T01:00:00Z"), userId: "system" });
  await closeEventFiles();
  const today = await readEventsFromFile("2026-11-02");
  assert.deepStrictEqual({ e: today[0].e, u: today[0].u, p: today[0].p }, { e: "job_done", u: "system", p: { count: 3 } });
  assert.strictEqual((await readEventsFromFile("2026-11-01")).length, 1);
});

test("the error middleware records the failure and passes it on", async () => {
  const h = hearald({ eventsDir: await tempDir(), nowFn, getUserId: (req) => req.get("x-user") || null, analytics: { enabled: false } });
  const app = jsonApp();
  app.get("/fail", () => { throw new Error("route exploded"); });
  app.use(h.errorMiddlware);
  app.use((err, req, res, next) => res.status(500).json({ handled: err.message })); // eslint-disable-line no-unused-vars
  const server = await listen(app);
  try {
    const res = await fetch(`${server.base}/fail?x=1`, { headers: { "x-user": "u9" } });
    assert.strictEqual(res.status, 500);
    assert.deepStrictEqual(await res.json(), { handled: "route exploded" }, "the error still reaches the app's own handler");
    const [event] = await readErrors();
    assert.strictEqual(event.u, "u9");
    assert.strictEqual(event.p.message, "route exploded");
    assert.strictEqual(event.p.url, "/fail?x=1");
    assert.strictEqual(event.p.method, "GET");
  } finally {
    await server.close();
  }
});
