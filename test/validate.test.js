import test from "node:test";
import assert from "node:assert";
import { validateEvent } from "../src/server/validate.js";

const schema = {
  completion_added: {
    platform: { type: "string", enum: ["web", "ios"], required: true },
    goal_type: { type: "string", enum: ["binary", "counter", "monthly"] },
    count: { type: "number", integer: true, min: 0, max: 1000 },
    first: { type: "boolean" },
  },
};
const ok = (event) => validateEvent(schema, event);

test("keeps only the parameters named in the schema", () => {
  assert.deepStrictEqual(
    ok({ e: "completion_added", u: "user-1", p: { platform: "web", goal_type: "counter", text: "Run 5k", count: 3, first: true } }),
    { e: "completion_added", u: "user-1", p: { platform: "web", goal_type: "counter", count: 3, first: true } }
  );
});

test("drops unknown events, including prototype names", () => {
  assert.strictEqual(ok({ e: "something_else", u: "u", p: {} }), null);
  assert.strictEqual(ok({ e: "toString", u: "u", p: {} }), null);
  assert.strictEqual(ok({ e: "__proto__", u: "u", p: {} }), null);
  assert.strictEqual(ok({ e: 5, u: "u", p: {} }), null);
  assert.strictEqual(ok({}), null);
});

test("rejects a missing required parameter or one of the wrong kind", () => {
  assert.strictEqual(ok({ e: "completion_added", u: "u", p: {} }), null);
  assert.strictEqual(ok({ e: "completion_added", u: "u", p: { platform: "android" } }), null);
  assert.strictEqual(ok({ e: "completion_added", u: "u", p: { platform: "web", count: 1.5 } }), null);
  assert.strictEqual(ok({ e: "completion_added", u: "u", p: { platform: "web", count: 1001 } }), null);
  assert.strictEqual(ok({ e: "completion_added", u: "u", p: { platform: "web", first: "yes" } }), null);
  assert.strictEqual(ok({ e: "completion_added", u: "u", p: { platform: ["web"] } }), null);
});

test("user ids are short strings or null", () => {
  assert.strictEqual(ok({ e: "completion_added", u: null, p: { platform: "web" } }).u, null);
  assert.strictEqual(ok({ e: "completion_added", p: { platform: "web" } }).u, null);
  assert.strictEqual(ok({ e: "completion_added", u: "x".repeat(65), p: { platform: "web" } }), null);
  assert.strictEqual(ok({ e: "completion_added", u: 12, p: { platform: "web" } }), null);
  assert.strictEqual(ok({ e: "completion_added", u: "", p: { platform: "web" } }), null);
});

test("strings are length limited", () => {
  const long = { e: "t", u: "u", p: { s: "x".repeat(65) } };
  assert.strictEqual(validateEvent({ t: { s: { type: "string" } } }, long), null);
  assert.ok(validateEvent({ t: { s: { type: "string", maxLength: 100 } } }, long));
});
