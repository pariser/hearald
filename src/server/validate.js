// Validates events arriving on the public event endpoint against a schema, so the endpoint cannot
// be used to store arbitrary text or unbounded data.
//
//   schema = {
//     completion_added: {
//       platform: { type: "string", enum: ["web", "ios"], required: true },
//       goal_type: { type: "string", enum: ["binary", "counter", "monthly"] },
//       count: { type: "number", integer: true, min: 0, max: 1000 },
//     },
//   };
//
// Events not in the schema, and parameters not listed for their event, are dropped. An event with a
// missing required parameter or a parameter of the wrong type is rejected whole.

const MAX_USER_ID_LENGTH = 64;
const DEFAULT_MAX_STRING = 64;

function checkParam(spec, value) {
  switch (spec.type) {
    case "string":
      if (typeof value !== "string") return { ok: false };
      if (value.length > (spec.maxLength ?? DEFAULT_MAX_STRING)) return { ok: false };
      if (spec.enum && !spec.enum.includes(value)) return { ok: false };
      return { ok: true, value };
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) return { ok: false };
      if (spec.integer && !Number.isInteger(value)) return { ok: false };
      if (spec.min !== undefined && value < spec.min) return { ok: false };
      if (spec.max !== undefined && value > spec.max) return { ok: false };
      return { ok: true, value };
    case "boolean":
      return typeof value === "boolean" ? { ok: true, value } : { ok: false };
    default:
      throw new Error(`unknown parameter type "${spec.type}"`);
  }
}

// Returns the cleaned { e, u, p }, or null when the event should be dropped.
export function validateEvent(schema, { e, u, p } = {}) {
  if (typeof e !== "string" || !Object.hasOwn(schema, e)) return null;
  if (u !== null && u !== undefined) {
    if (typeof u !== "string" || !u || u.length > MAX_USER_ID_LENGTH) return null;
  }
  const given = p && typeof p === "object" && !Array.isArray(p) ? p : {};
  const clean = {};
  for (const [name, spec] of Object.entries(schema[e])) {
    if (!Object.hasOwn(given, name)) {
      if (spec.required) return null;
      continue;
    }
    const result = checkParam(spec, given[name]);
    if (!result.ok) return null;
    clean[name] = result.value;
  }
  return { e, u: u ?? null, p: clean };
}
