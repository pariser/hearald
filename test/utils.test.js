import test from "node:test";
import assert from "node:assert";
import { iso, nowAsPstDate, defaultEndDate, omitProperties } from "../src/shared/utils.js";

const pacific = (utcIso) => nowAsPstDate(new Date(utcIso)).toISOString().replace(".000Z", "Z");

test("nowAsPstDate holds the Pacific wall clock in its UTC fields", () => {
  assert.strictEqual(pacific("2026-07-01T06:30:00Z"), "2026-06-30T23:30:00Z"); // summer: UTC-7
  assert.strictEqual(pacific("2026-12-01T07:59:59Z"), "2026-11-30T23:59:59Z"); // winter: UTC-8
  assert.strictEqual(pacific("2026-12-01T08:00:00Z"), "2026-12-01T00:00:00Z");
});

test("it follows the daylight saving changes", () => {
  // 2026-03-08: clocks jump from 02:00 PST to 03:00 PDT, at 10:00 UTC
  assert.strictEqual(pacific("2026-03-08T09:59:59Z"), "2026-03-08T01:59:59Z");
  assert.strictEqual(pacific("2026-03-08T10:00:00Z"), "2026-03-08T03:00:00Z");
  // 2026-11-01: clocks fall back from 02:00 PDT to 01:00 PST, at 09:00 UTC
  assert.strictEqual(pacific("2026-11-01T08:59:59Z"), "2026-11-01T01:59:59Z");
  assert.strictEqual(pacific("2026-11-01T09:00:00Z"), "2026-11-01T01:00:00Z");
});

test("the day bucket is the Pacific day, whatever the server's time zone", () => {
  const original = process.env.TZ;
  try {
    for (const tz of ["UTC", "Asia/Tokyo", "America/New_York", "Pacific/Auckland"]) {
      process.env.TZ = tz;
      assert.strictEqual(iso(nowAsPstDate(new Date("2026-10-07T02:00:00Z"))), "2026-10-06", tz);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("iso formats the UTC date with padding", () => {
  assert.strictEqual(iso(new Date("2026-01-05T23:59:59Z")), "2026-01-05");
  assert.strictEqual(iso(new Date("2026-12-31T00:00:00Z")), "2026-12-31");
});

test("defaultEndDate is the start of yesterday in the same buckets", () => {
  const now = nowAsPstDate(new Date("2026-12-01T20:15:00Z")); // Pacific: Dec 1, 12:15
  assert.strictEqual(defaultEndDate(now).toISOString(), "2026-11-30T00:00:00.000Z");
  assert.strictEqual(defaultEndDate(new Date("2027-01-01T05:00:00Z")).toISOString(), "2026-12-31T00:00:00.000Z");
});

test("defaultEndDate does not depend on the server's time zone", () => {
  const original = process.env.TZ;
  try {
    const results = new Set();
    for (const tz of ["UTC", "Asia/Tokyo", "America/Los_Angeles"]) {
      process.env.TZ = tz;
      results.add(defaultEndDate(new Date("2026-12-01T12:00:00Z")).toISOString());
    }
    assert.strictEqual(results.size, 1);
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("omitProperties returns a copy without the named keys", () => {
  const source = { a: 1, b: 2, c: 3 };
  assert.deepStrictEqual(omitProperties(source, "a", "c", "missing"), { b: 2 });
  assert.deepStrictEqual(source, { a: 1, b: 2, c: 3 });
});
