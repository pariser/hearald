import test from "node:test";
import assert from "node:assert";
import hearaldClient, { eventBus } from "../src/client.js";

// The client expects a browser; stand in for the few things it reads.
globalThis.document = { referrer: "https://referrer.example/" };
globalThis.window = { location: { toString: () => "https://app.example/page" }, innerWidth: 390, innerHeight: 700 };
globalThis.screen = { width: 1170, height: 2532 };
// Node 21 and later have a `navigator`; older ones (18, 20) do not
if (!globalThis.navigator) Object.defineProperty(globalThis, "navigator", { value: { userAgent: "test-agent" }, configurable: true });

function recorder({ fail = false } = {}) {
  const sent = [];
  return {
    sent,
    fetchImpl: async (url, init) => {
      if (fail) throw new Error("offline");
      sent.push({ url, init, body: JSON.parse(init.body) });
      return { ok: true };
    },
  };
}
const settle = () => new Promise((r) => setTimeout(r, 5));

test("trackEvent posts the event, user and payload as JSON", async () => {
  const r = recorder();
  const h = hearaldClient({ endpoint: "/events", fetchImpl: r.fetchImpl });
  h.trackEvent({ eventName: "app_open", userId: "u1", payload: { platform: "web" } });
  await settle();
  assert.strictEqual(r.sent.length, 1);
  assert.strictEqual(r.sent[0].url, "/events");
  assert.strictEqual(r.sent[0].init.method, "POST");
  assert.strictEqual(r.sent[0].init.headers["Content-Type"], "application/json");
  assert.deepStrictEqual(r.sent[0].body, { e: "app_open", u: "u1", p: { platform: "web" } });
  h.dispose();
});

test("the user comes from getUserId when the event has none, and is null if neither", async () => {
  const r = recorder();
  const h = hearaldClient({ fetchImpl: r.fetchImpl, getUserId: () => "from-config" });
  h.trackEvent({ eventName: "a" });
  h.trackEvent({ eventName: "b", userId: "explicit" });
  await settle();
  assert.deepStrictEqual(r.sent.map((s) => s.body.u), ["from-config", "explicit"]);
  h.dispose();
  const r2 = recorder();
  const h2 = hearaldClient({ fetchImpl: r2.fetchImpl });
  h2.trackEvent({ eventName: "a" });
  await settle();
  assert.strictEqual(r2.sent[0].body.u, null);
  assert.deepStrictEqual(r2.sent[0].body.p, {});
  h2.dispose();
});

test("a failed send goes to onError and never throws", async () => {
  const errors = [];
  const h = hearaldClient({ fetchImpl: recorder({ fail: true }).fetchImpl, onError: (...a) => errors.push(a) });
  h.trackEvent({ eventName: "x", userId: "u", payload: { k: 1 } });
  await settle();
  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0][0].message, "offline");
  assert.deepStrictEqual(errors[0].slice(1), ["x", "u", { k: 1 }]);
  h.dispose();
});

test("trackVisit sends what the page looks like", async () => {
  const r = recorder();
  const h = hearaldClient({ fetchImpl: r.fetchImpl });
  h.trackVisit({ userId: "u", payload: { campaign: "spring" } });
  await settle();
  const { e, p } = r.sent[0].body;
  assert.strictEqual(e, "visit");
  assert.strictEqual(p.referrer, "https://referrer.example/");
  assert.strictEqual(p.url, "https://app.example/page");
  assert.strictEqual(p.screen_resolution, "1170x2532");
  assert.strictEqual(p.window_resolution, "390x700");
  assert.strictEqual(p.campaign, "spring");
  assert.ok(p.user_agent);
  h.dispose();
});

test("trackError reads a window error event, a plain Error, and an event with no error object", async () => {
  const r = recorder();
  const h = hearaldClient({ fetchImpl: r.fetchImpl });
  const boom = new Error("boom");
  h.trackError({ error: { error: boom, filename: "app.js", lineno: 12, colno: 5 } });
  h.trackError({ error: new Error("plain") });
  h.trackError({ error: { error: null, message: "Script error." } }); // cross-origin errors have no object
  h.trackError({ error: undefined });
  await settle();
  const bodies = r.sent.map((s) => s.body);
  assert.strictEqual(bodies.length, 4, "none of them threw");
  assert.ok(bodies.every((b) => b.e === "error"));
  assert.strictEqual(bodies[0].p.message, "boom");
  assert.strictEqual(bodies[0].p.file_name, "app.js");
  assert.strictEqual(bodies[0].p.line_number, 12);
  assert.match(bodies[0].p.source, /Error|at /);
  assert.strictEqual(bodies[1].p.message, "plain");
  assert.strictEqual(bodies[2].p.message, "Script error.");
  h.dispose();
});

test("calling hearald twice does not send each event twice", async () => {
  const first = recorder();
  const second = recorder();
  hearaldClient({ fetchImpl: first.fetchImpl });
  const h = hearaldClient({ fetchImpl: second.fetchImpl });
  h.trackEvent({ eventName: "once" });
  await settle();
  assert.strictEqual(first.sent.length, 0, "the replaced client is quiet");
  assert.strictEqual(second.sent.length, 1);
  h.dispose();
});

test("after dispose, nothing is sent", async () => {
  const r = recorder();
  const h = hearaldClient({ fetchImpl: r.fetchImpl });
  h.dispose();
  h.trackEvent({ eventName: "x" });
  await settle();
  assert.strictEqual(r.sent.length, 0);
  assert.strictEqual(eventBus.listeners.event?.size ?? 0, 0);
});

test("a 404 or 500 from the server goes to onError, and never throws", async () => {
  for (const status of [404, 500, 403]) {
    const errors = [];
    const h = hearaldClient({
      fetchImpl: async () => ({ ok: false, status }),
      onError: (...a) => errors.push(a),
    });
    h.trackEvent({ eventName: "x", userId: "u", payload: { k: 1 } });
    await settle();
    assert.strictEqual(errors.length, 1, String(status));
    assert.match(errors[0][0].message, new RegExp(String(status)));
    assert.deepStrictEqual(errors[0].slice(1), ["x", "u", { k: 1 }]);
    h.dispose();
  }
});

test("a good answer (204) is not an error", async () => {
  const errors = [];
  const h = hearaldClient({ fetchImpl: async () => ({ ok: true, status: 204 }), onError: (...a) => errors.push(a) });
  h.trackEvent({ eventName: "x" });
  await settle();
  assert.deepStrictEqual(errors, []);
  h.dispose();
});

test("disposing an old client does not silence the one that replaced it", async () => {
  const first = recorder();
  const second = recorder();
  const h1 = hearaldClient({ fetchImpl: first.fetchImpl });
  const h2 = hearaldClient({ fetchImpl: second.fetchImpl });
  h1.dispose();
  h2.trackEvent({ eventName: "still-sent" });
  await settle();
  assert.strictEqual(second.sent.length, 1, "the newer client keeps sending, once");
  assert.strictEqual(first.sent.length, 0, "the replaced client does not");
  h2.dispose();
  h2.trackEvent({ eventName: "after-dispose" });
  await settle();
  assert.strictEqual(second.sent.length, 1, "a disposed client stops");
});
