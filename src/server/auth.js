import { timingSafeEqual } from "crypto";
import log from "./logger.js";
import { asyncHandler } from "./asyncHandler.js";

// Constant-time string comparison.
export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * HTTP Basic authentication for the analytics dashboard.
 *
 * Wrong guesses are counted per `req.ip`. That is the caller's address only when your app sets
 * Express's `trust proxy` to match your setup: behind a reverse proxy without it, every visitor
 * shares the proxy's address (one attacker locks everybody out), and with a `trust proxy` that
 * trusts too much a caller can send a forged X-Forwarded-For to dodge the lockout.
 *
 * @param {Object} options
 * @param {(username: string, password: string) => boolean | Promise<boolean>} options.verify
 *   Decides whether the credentials are right. Compare with a constant-time function, and store a
 *   hash of the password, never the password. If it throws, the request gets a 500 (and is not
 *   counted as a wrong guess).
 * @param {string} [options.realm="hearald"]
 * @param {number} [options.maxFailures=10] wrong guesses allowed per IP in the window, before 429
 * @param {number} [options.windowMs=900000] the window, 15 minutes by default
 * @param {number} [options.maxTrackedIps=10000] the most addresses remembered at once, so a flood of
 *   distinct addresses cannot grow memory without limit (the oldest are forgotten first)
 */
export function basicAuth({ verify, realm = "hearald", maxFailures = 10, windowMs = 15 * 60 * 1000, maxTrackedIps = 10000, now = Date.now } = {}) {
  if (typeof verify !== "function") throw new Error("basicAuth needs a verify(username, password) function");
  const failures = new Map(); // ip -> { count, resetAt }, oldest first

  function prune(t) {
    for (const [ip, entry] of failures) {
      if (entry.resetAt <= t) failures.delete(ip);
    }
    // Still too many (a burst inside one window): forget the oldest
    for (const ip of failures.keys()) {
      if (failures.size < maxTrackedIps) break;
      failures.delete(ip);
    }
  }

  return asyncHandler(async function basicAuthMiddleware(req, res, next) {
    const ip = req.ip || "unknown";
    const t = now();
    let entry = failures.get(ip);
    if (entry && entry.resetAt <= t) {
      failures.delete(ip);
      entry = undefined;
    }
    if (entry && entry.count >= maxFailures) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - t) / 1000)));
      return res.status(429).send("Too many attempts");
    }

    // The scheme name is case-insensitive (RFC 7235)
    const match = /^basic\s+([A-Za-z0-9+/=]+)\s*$/i.exec(req.get("authorization") || "");
    if (match) {
      // Count the attempt now, before the (possibly slow) verify: if it were counted afterwards,
      // any number of parallel guesses would all be checked against a count of zero.
      if (!entry) {
        prune(t);
        entry = { count: 0, resetAt: t + windowMs };
        failures.set(ip, entry);
      }
      entry.count += 1;

      const decoded = Buffer.from(match[1], "base64").toString("utf8");
      const colon = decoded.indexOf(":");
      let ok = false;
      try {
        ok = colon > -1 && (await verify(decoded.slice(0, colon), decoded.slice(colon + 1)));
      } catch (err) {
        entry.count -= 1; // a broken verify is not the caller's wrong guess
        log.error("basicAuth: verify threw", err);
        return res.status(500).send("Authentication error");
      }
      if (ok) {
        failures.delete(ip);
        return next();
      }
    }
    res.set("WWW-Authenticate", `Basic realm="${realm}", charset="UTF-8"`);
    return res.status(401).send("Authentication required");
  });
}
