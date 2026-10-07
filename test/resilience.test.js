import test from "node:test";
import assert from "node:assert";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import hearaldConfiguration from "../src/server/configuration.js";
import {
  closeEventFiles,
  openEventFileCount,
  readEventsFromFile,
  writeEvent,
} from "../src/server/serverEvents.js";
import { tempDir, unusableDir, sleep, watchUnhandledRejections } from "../harness.js";

const day = new Date("2026-11-02T12:00:00Z");

async function withIdleDelay(ms, fn) {
  hearaldConfiguration.setIdleCloseMs(ms);
  try {
    await fn();
  } finally {
    hearaldConfiguration.setIdleCloseMs(60 * 1000);
    await closeEventFiles();
  }
}

test("a failed file open does not crash the process later, and writing works again once fixed", async () => {
  await withIdleDelay(20, async () => {
    const watcher = watchUnhandledRejections();
    try {
      hearaldConfiguration.setEventsDir(await unusableDir());
      await assert.rejects(() => writeEvent(day, { e: "x", u: "a", p: {} }), /ENOTDIR/);
      assert.strictEqual(openEventFileCount(), 0, "the failed open is not kept");
      await sleep(100); // well past the idle delay: the old timer closed the rejected promise here
      assert.deepStrictEqual(watcher.seen, []);

      const good = await tempDir();
      hearaldConfiguration.setEventsDir(good);
      await writeEvent(day, { e: "x", u: "b", p: {} });
      await closeEventFiles();
      assert.deepStrictEqual((await readEventsFromFile("2026-11-02")).map((e) => e.u), ["b"]);
    } finally {
      watcher.stop();
    }
  });
});

test("an idle file is closed after the configured delay", async () => {
  await withIdleDelay(20, async () => {
    hearaldConfiguration.setEventsDir(await tempDir());
    await writeEvent(day, { e: "x", p: {} });
    assert.strictEqual(openEventFileCount(), 1);
    await sleep(100);
    assert.strictEqual(openEventFileCount(), 0);
  });
});

test("an idle file is closed even if the events directory changed meanwhile", async () => {
  await withIdleDelay(20, async () => {
    hearaldConfiguration.setEventsDir(await tempDir());
    await writeEvent(day, { e: "x", p: {} });
    hearaldConfiguration.setEventsDir(await tempDir());
    await sleep(100);
    assert.strictEqual(openEventFileCount(), 0, "the handle for the old directory was closed, not leaked");
  });
});

test("after a crash left half a line, the next event still gets a line of its own", async () => {
  const dir = await tempDir();
  hearaldConfiguration.setEventsDir(dir);
  await writeFile(join(dir, "2026-11-02.log"), '{"e":"a"}\n{"e":"b"');
  await writeEvent(day, { e: "c", u: null, p: {} });
  await closeEventFiles();
  assert.deepStrictEqual((await readEventsFromFile("2026-11-02")).map((e) => e.e), ["a", "c"]);
});

test("a file that ends properly gets no extra blank line, and an empty file is fine", async () => {
  const dir = await tempDir();
  hearaldConfiguration.setEventsDir(dir);
  await writeFile(join(dir, "2026-11-02.log"), '{"e":"a"}\n');
  await writeEvent(day, { e: "b", u: null, p: {} });
  await closeEventFiles();
  const text = await readFile(join(dir, "2026-11-02.log"), "utf8");
  assert.strictEqual(text.split("\n").filter((l) => !l).length, 1, "only the final newline is empty");
  await writeEvent(new Date("2026-11-03T12:00:00Z"), { e: "c", u: null, p: {} });
  await closeEventFiles();
  assert.strictEqual((await readEventsFromFile("2026-11-03")).length, 1);
});
