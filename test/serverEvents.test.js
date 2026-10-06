import test from "node:test";
import assert from "node:assert";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import hearaldConfiguration from "../src/server/configuration.js";
import {
  closeEventFiles,
  loadEventsOverWindow,
  readEventsFromFile,
  writeEvent,
} from "../src/server/serverEvents.js";
import { tempDir } from "../harness.js";

const day = new Date("2026-11-02T12:00:00Z");

test("events go to a file per day, with visits and errors kept apart", async () => {
  const dir = await tempDir();
  hearaldConfiguration.setEventsDir(dir);
  await writeEvent(day, { e: "app_open", u: "a", p: {} });
  await writeEvent(day, { e: "visit", u: "a", p: { url: "/" } });
  await writeEvent(day, { e: "error", u: null, p: { message: "boom" } });
  await closeEventFiles();
  assert.deepStrictEqual((await readdir(dir)).sort(), ["2026-11-02-errors.log", "2026-11-02-visits.log", "2026-11-02.log"]);
  const lines = (await readFile(join(dir, "2026-11-02.log"), "utf8")).trim().split("\n");
  assert.deepStrictEqual(JSON.parse(lines[0]), { t: day.toISOString(), e: "app_open", u: "a", p: {} });
});

test("many writes at once all arrive, one line each", async () => {
  const dir = await tempDir();
  hearaldConfiguration.setEventsDir(dir);
  await Promise.all(Array.from({ length: 200 }, (_, i) => writeEvent(day, { e: "x", u: String(i), p: {} })));
  await closeEventFiles();
  const events = await readEventsFromFile("2026-11-02");
  assert.strictEqual(events.length, 200);
  assert.strictEqual(new Set(events.map((e) => e.u)).size, 200);
});

test("a missing day is just empty, with no warning", async () => {
  hearaldConfiguration.setEventsDir(await tempDir());
  const warnings = [];
  const original = console.warn;
  console.warn = (...a) => warnings.push(a);
  try {
    assert.deepStrictEqual(await readEventsFromFile("1999-01-01"), []);
  } finally {
    console.warn = original;
  }
  assert.deepStrictEqual(warnings, []);
});

test("a damaged line is skipped, the rest are read", async () => {
  const dir = await tempDir();
  hearaldConfiguration.setEventsDir(dir);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "2026-11-02.log"), '{"e":"a"}\nnot json\n\n{"e":"b"}\n{"e":"c"');
  assert.deepStrictEqual((await readEventsFromFile("2026-11-02")).map((e) => e.e), ["a", "b"]);
});

test("a window reads every day, in any server time zone and across daylight saving changes", async () => {
  const dir = await tempDir();
  hearaldConfiguration.setEventsDir(dir);
  for (const d of ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-11-01", "2026-10-31", "2026-10-30"]) {
    await writeFile(join(dir, `${d}.log`), `${JSON.stringify({ e: "x", u: d })}\n`);
  }
  const original = process.env.TZ;
  try {
    for (const tz of ["UTC", "America/Los_Angeles", "Europe/London", "Australia/Sydney", "Pacific/Auckland"]) {
      process.env.TZ = tz;
      const spring = await loadEventsOverWindow(new Date("2026-03-09T00:00:00Z"), 4);
      assert.deepStrictEqual(spring.map((e) => e.u).sort(), ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09"], tz);
      const fall = await loadEventsOverWindow(new Date("2026-11-01T00:00:00Z"), 3);
      assert.deepStrictEqual(fall.map((e) => e.u).sort(), ["2026-10-30", "2026-10-31", "2026-11-01"], tz);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("a window can read the visits files instead", async () => {
  const dir = await tempDir();
  hearaldConfiguration.setEventsDir(dir);
  await writeEvent(day, { e: "visit", u: "v", p: {} });
  await writeEvent(day, { e: "app_open", u: "o", p: {} });
  await closeEventFiles();
  assert.deepStrictEqual((await loadEventsOverWindow(day, 1, "visits")).map((e) => e.u), ["v"]);
  assert.deepStrictEqual((await loadEventsOverWindow(day, 1)).map((e) => e.u), ["o"]);
});

test("changing the events directory never reuses a handle from the old one", async () => {
  const first = await tempDir();
  const second = await tempDir();
  hearaldConfiguration.setEventsDir(first);
  await writeEvent(day, { e: "x", u: "one", p: {} });
  hearaldConfiguration.setEventsDir(second);
  await writeEvent(day, { e: "x", u: "two", p: {} });
  await closeEventFiles();
  assert.deepStrictEqual((await readEventsFromFile("2026-11-02")).map((e) => e.u), ["two"]);
  hearaldConfiguration.setEventsDir(first);
  assert.deepStrictEqual((await readEventsFromFile("2026-11-02")).map((e) => e.u), ["one"]);
});
