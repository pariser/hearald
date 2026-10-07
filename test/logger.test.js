import test from "node:test";
import assert from "node:assert";
import { Logger } from "../src/server/logger.js";
import hearaldConfiguration from "../src/server/configuration.js";

function capture(fn) {
  const lines = [];
  const original = { log: console.log, warn: console.warn, error: console.error };
  console.log = (...a) => lines.push(["log", ...a]);
  console.warn = (...a) => lines.push(["warn", ...a]);
  console.error = (...a) => lines.push(["error", ...a]);
  try {
    fn();
  } finally {
    Object.assign(console, original);
  }
  return lines.map((l) => l[1]);
}
const all = (logger) => () => {
  logger.debug("d");
  logger.info("i");
  logger.warn("w");
  logger.error("e");
};

test("each level shows itself and everything more serious", () => {
  for (const [level, expected] of [
    ["debug", ["[DEBUG]", "[INFO]", "[WARN]", "[ERROR]"]],
    ["info", ["[INFO]", "[WARN]", "[ERROR]"]],
    ["warn", ["[WARN]", "[ERROR]"]],
    ["error", ["[ERROR]"]],
  ]) {
    assert.deepStrictEqual(capture(all(new Logger({ logLevel: level }))), expected, level);
  }
});

test("an unknown level behaves like warn", () => {
  assert.deepStrictEqual(capture(all(new Logger({ logLevel: "loud" }))), ["[WARN]", "[ERROR]"]);
});

test("the default is quiet: warnings and errors only", () => {
  assert.strictEqual(hearaldConfiguration.logLevel, "warn");
});

test("the shared logger follows the configured level", async () => {
  const { default: log } = await import("../src/server/logger.js");
  hearaldConfiguration.setLogLevel("debug");
  assert.deepStrictEqual(capture(all(log)), ["[DEBUG]", "[INFO]", "[WARN]", "[ERROR]"]);
  hearaldConfiguration.setLogLevel("error");
  assert.deepStrictEqual(capture(all(log)), ["[ERROR]"]);
  hearaldConfiguration.setLogLevel("warn");
});
