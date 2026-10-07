import test from "node:test";
import assert from "node:assert";
import { readFile, readdir } from "fs/promises";
import express from "express";
import hearald, { basicAuth } from "../src/index.js";
import hearaldClient from "../src/client.js";
import { closeEventFiles } from "../src/server/serverEvents.js";
import { readEventsFromFile } from "../src/server/serverEvents.js";
import { tempDir, listen } from "../harness.js";

// The README's code is what people copy, so run it: the server block builds a real Express app, the
// browser block talks to it, and the event has to land in the log.
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const blocks = [...readme.matchAll(/```js\n([\s\S]*?)```/g)].map((m) => m[1]);
const serverBlock = blocks.find((b) => b.includes("eventMiddleware"));
const browserBlock = blocks.find((b) => b.includes('from "hearald/client"'));
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

// stand-ins for the browser, for the client block
globalThis.document ??= { referrer: "" };
globalThis.window = { location: { toString: () => "https://app.example/" }, innerWidth: 1, innerHeight: 1, addEventListener() {} };
globalThis.screen = { width: 1, height: 1 };
if (!globalThis.navigator) Object.defineProperty(globalThis, "navigator", { value: { userAgent: "test" }, configurable: true });

async function runServerBlock(eventsDir) {
  const code = serverBlock
    .replace(/^import .*$/gm, "")
    .replace('"/var/lib/myapp/events"', JSON.stringify(eventsDir))
    .replace(/await h\.shutDown\(\);.*$/m, "return { app, h };");
  return new AsyncFunction("express", "hearald", "basicAuth", "statDefinitions", "passwordMatches", code)(
    express, hearald, basicAuth, { raw_metrics: {}, computed_metrics: {} }, () => true
  );
}

test("the README's server and browser snippets work together: the event lands in the log", async () => {
  const eventsDir = await tempDir();
  const { app } = await runServerBlock(eventsDir);
  const server = await listen(app);
  try {
    const errors = [];
    const code = browserBlock
      .replace(/^import .*$/gm, "")
      .replace('endpoint: "/events",', `endpoint: "/events", fetchImpl: (url, init) => fetch("${server.base}" + url, init),`)
      .replace("onError: (err, eventName) => {},", "onError: (err) => errors.push(err),")
      .replace(/h\.dispose\(\);.*\n.*$/m, "return h;");
    const h = await new AsyncFunction("hearaldClient", "currentUserId", "errors", code)(hearaldClient, "user-1", errors);
    h.trackEvent({ eventName: "app_open", payload: { platform: "web" } });
    await new Promise((r) => setTimeout(r, 100));
    h.dispose();

    assert.deepStrictEqual(errors, [], "the client reported no failure");
    await closeEventFiles();
    const files = (await readdir(eventsDir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.log$/.test(f));
    assert.strictEqual(files.length, 1, "one event log was written");
    const event = (await readEventsFromFile(files[0].replace(/\.log$/, ""))).find((ev) => ev.e === "app_open");
    assert.ok(event, "the browser event is in the log (the snippet's own job_done is there too)");
    assert.deepStrictEqual({ e: event.e, u: event.u, p: event.p }, { e: "app_open", u: "user-1", p: { platform: "web" } });
  } finally {
    await server.close();
  }
});

test("the README's server snippet does not serve the event route at the wrong path", async () => {
  const { app } = await runServerBlock(await tempDir());
  const server = await listen(app);
  try {
    const post = (path) => fetch(`${server.base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    assert.strictEqual((await post("/events")).status, 204);
    assert.strictEqual((await post("/events/e")).status, 404);
  } finally {
    await server.close();
  }
});

test("the README's dashboard mount asks for a password", async () => {
  const { app } = await runServerBlock(await tempDir());
  const server = await listen(app);
  try {
    assert.strictEqual((await fetch(`${server.base}/admin/analytics/layout`)).status, 401);
  } finally {
    await server.close();
  }
});

test("a client pointed at a route that does not exist reports it through onError", async () => {
  const app = express();
  const server = await listen(app);
  try {
    const errors = [];
    const h = hearaldClient({ endpoint: `${server.base}/events`, onError: (err) => errors.push(err) });
    h.trackEvent({ eventName: "app_open" });
    await new Promise((r) => setTimeout(r, 100));
    h.dispose();
    assert.strictEqual(errors.length, 1);
    assert.match(errors[0].message, /404/);
  } finally {
    await server.close();
  }
});

