import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import express from "express";

export const tempDir = () => mkdtemp(join(tmpdir(), "hearald-"));

export async function listen(app) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

export const jsonApp = () => {
  const app = express();
  app.use(express.json());
  return app;
};

// A directory path that cannot be created (its parent is a plain file), so opening an event file
// there fails with ENOTDIR. Stands in for EROFS, ENOSPC or EACCES.
export async function unusableDir() {
  const blocker = join(await tempDir(), "blocker");
  await writeFile(blocker, "x");
  return join(blocker, "events");
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Collects unhandled rejections while a test runs, so a crash-in-waiting shows up as a failure
// with a clear message instead of killing the test runner.
export function watchUnhandledRejections() {
  const seen = [];
  const listener = (reason) => seen.push(reason);
  process.on("unhandledRejection", listener);
  return {
    seen,
    stop: () => process.off("unhandledRejection", listener),
  };
}

// Silences console.error while `fn` runs (hearald logs failures there) and returns what was logged.
export async function captureErrorLog(fn) {
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args);
  try {
    await fn();
  } finally {
    console.error = original;
  }
  return logged;
}
