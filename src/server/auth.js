import { timingSafeEqual } from "crypto";

// Constant-time string comparison.
export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * HTTP Basic authentication for the analytics dashboard.
 *
 * @param {Object} options
 * @param {(username: string, password: string) => boolean | Promise<boolean>} options.verify
 *   Decides whether the credentials are right. Compare with a constant-time function, and store a
 *   hash of the password, never the password.
 * @param {string} [options.realm="hearald"]
 * @param {number} [options.maxFailures=10] wrong guesses allowed per IP in the window, before 429
 * @param {number} [options.windowMs=900000] the window, 15 minutes by default
 */
export function basicAuth({ verify, realm = "hearald", maxFailures = 10, windowMs = 15 * 60 * 1000, now = Date.now } = {}) {
  if (typeof verify !== "function") throw new Error("basicAuth needs a verify(username, password) function");
  const failures = new Map(); // ip -> { count, resetAt }

  return async function basicAuthMiddleware(req, res, next) {
    const ip = req.ip || "unknown";
    const entry = failures.get(ip);
    if (entry && entry.resetAt > now() && entry.count >= maxFailures) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now()) / 1000)));
      return res.status(429).send("Too many attempts");
    }

    const match = /^Basic ([A-Za-z0-9+/=]+)$/.exec(req.get("authorization") || "");
    if (match) {
      const decoded = Buffer.from(match[1], "base64").toString("utf8");
      const colon = decoded.indexOf(":");
      if (colon > -1 && (await verify(decoded.slice(0, colon), decoded.slice(colon + 1)))) {
        failures.delete(ip);
        return next();
      }
      const current = entry && entry.resetAt > now() ? entry : { count: 0, resetAt: now() + windowMs };
      current.count += 1;
      failures.set(ip, current);
    }
    res.set("WWW-Authenticate", `Basic realm="${realm}", charset="UTF-8"`);
    return res.status(401).send("Authentication required");
  };
}
