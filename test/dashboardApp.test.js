// Renders the real dashboard App in a fake browser (happy-dom) against a real hearald router,
// so what is covered is what a visitor gets: the page, /layout and /data, then the rendered DOM.
import test, { before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import hearald from "../src/index.js";
import { writeEvent, closeEventFiles } from "../src/server/serverEvents.js";
import { tempDir, sleep, listen, jsonApp } from "../harness.js";

const statDefinitions = {
  raw_metrics: {
    "all.opens": { aggregator: "count", event: "app_open" },
    "all.signups": { aggregator: "count", event: "signup" },
  },
  computed_metrics: {},
  ui: {
    chartContexts: [{ id: "all", menuName: "All users" }],
    sections: [
      {
        id: "activity",
        menuName: "Activity",
        stats: [
          { label: "App opens", key: "all.opens", type: "number" },
          { label: "Signups", key: "all.signups", type: "number" },
        ],
      },
    ],
  },
};

let App, render, html, dataCache;
let server, container;

before(async () => {
  // The app reads `window` and `fetch` when it runs, so register the fake browser first.
  GlobalRegistrator.register({ url: "http://127.0.0.1/" });
  ({ default: App } = await import("../src/public/js/App.js"));
  ({ dataCache } = await import("../src/public/js/util.js"));
  ({ render, html } = await import("htm/preact"));
});

after(() => GlobalRegistrator.unregister());

// Starts hearald with the given definitions and points the fake browser at its dashboard.
async function serve(definitions = statDefinitions, { events = [] } = {}) {
  const h = hearald({
    eventsDir: await tempDir(),
    analytics: { statDefinitions: definitions, allowUnauthenticated: true },
  });
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  for (const e of events) await writeEvent(yesterday, e);
  await closeEventFiles();
  const app = jsonApp();
  app.use("/analytics", h.analyticsMiddleware);
  server = await listen(app);
  window.happyDOM.setURL(`${server.base}/analytics`);
}

async function waitFor(check, what) {
  for (let i = 0; i < 100; i++) {
    const value = check();
    if (value) return value;
    await sleep(25);
  }
  assert.fail(`timed out waiting for ${what}`);
}

const mount = () => {
  render(html`<${App} />`, container);
  return container;
};
const text = () => container.textContent.replace(/\s+/g, " ");

let pageErrors;
const onError = (e) => pageErrors.push(e.error || e.reason || e);

beforeEach(() => {
  pageErrors = [];
  for (const key of Object.keys(dataCache)) delete dataCache[key]; // the app caches by date
  container = document.createElement("div");
  document.body.appendChild(container);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onError);
  process.on("unhandledRejection", onError);
});

afterEach(async () => {
  // The chart makes one request per day; let it finish before the server goes away.
  await waitFor(() => !container.querySelector("progress") && container.querySelector(".bar-chart__bar"), "the chart to finish").catch(() => {});
  render(null, container);
  container.remove();
  window.removeEventListener("error", onError);
  window.removeEventListener("unhandledrejection", onError);
  process.off("unhandledRejection", onError);
  await server?.close();
  server = null;
});

const noErrors = () => assert.deepStrictEqual(pageErrors.map(String), []);

test("with events, the dashboard shows the counts, the chart and the menus", async () => {
  await serve(statDefinitions, {
    events: [
      { e: "app_open", u: "a", p: {} },
      { e: "app_open", u: "b", p: {} },
      { e: "app_open", u: "a", p: {} },
      { e: "signup", u: "b", p: {} },
    ],
  });
  mount();
  await waitFor(() => /Activity/.test(text()), "the stat section");

  const tiles = [...container.querySelectorAll(".analytics__tile")].map((t) => t.textContent.replace(/\s+/g, " ").trim());
  assert.ok(tiles.some((t) => /App opens\s*3/.test(t)), `App opens tile in ${JSON.stringify(tiles)}`);
  assert.ok(tiles.some((t) => /Signups\s*1/.test(t)), `Signups tile in ${JSON.stringify(tiles)}`);

  // The chart loads one request per day, then draws a bar each (30 by default). It starts on the
  // "users" field, which this app does not define, so every bar is 0 until the field is changed.
  const bars = () => container.querySelectorAll(".bar-chart__bar").length;
  const barValues = () => [...container.querySelectorAll(".bar-chart__bar__label b")].map((b) => b.textContent.trim());
  await waitFor(() => bars() === 30, "30 bars");
  assert.ok(barValues().every((v) => v === "0"));

  const field = container.querySelector("select[name=field]");
  field.value = "opens";
  field.dispatchEvent(new window.Event("change", { bubbles: true }));
  await waitFor(() => bars() === 30 && barValues().includes("3"), "the opens chart"); // cached, so quick
  assert.deepStrictEqual(barValues().filter((v) => v !== "0"), ["3"], "only the day with events is above 0");

  const context = [...container.querySelectorAll("select[name=context] option")].map((o) => o.textContent.trim());
  assert.deepStrictEqual(context, ["All users"]);
  const fields = [...container.querySelectorAll("select[name=field] option")].map((o) => o.value);
  assert.deepStrictEqual(fields.sort(), ["opens", "signups"]);
  noErrors();
});

test("with no events at all, the dashboard loads and shows zeros instead of crashing", async () => {
  await serve();
  mount();
  await waitFor(() => /Activity/.test(text()), "the stat section");
  await waitFor(() => container.querySelectorAll(".bar-chart__bar").length === 30, "30 bars");
  assert.ok([...container.querySelectorAll(".bar-chart__bar__label b")].every((b) => b.textContent.trim() === "0"));
  noErrors();
});

test("a layout with no chart contexts or sections renders an empty dashboard (the first-run crash)", async () => {
  await serve({ ...statDefinitions, ui: undefined });
  mount();
  await waitFor(() => container.querySelector("select[name=context]"), "the chart menus");
  assert.strictEqual(container.querySelectorAll("select[name=context] option").length, 0);
  assert.strictEqual(container.querySelectorAll(".analytics__tile").length, 0);
  noErrors();
});

test("a layout that fails to load leaves the page usable", async () => {
  await serve();
  const realFetch = window.fetch;
  window.fetch = (url, ...rest) =>
    String(url).endsWith("/layout") ? Promise.reject(new Error("offline")) : realFetch(url, ...rest);
  try {
    mount();
    await waitFor(() => container.querySelector("select[name=context]"), "the chart menus");
    assert.strictEqual(container.querySelectorAll(".analytics__tile").length, 0);
    noErrors();
  } finally {
    window.fetch = realFetch;
  }
});
