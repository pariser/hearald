// Express middleware for hearald event tracking
import express from "express";
import log from "./logger.js";
import { nowAsPstDate } from "../shared/utils.js";
import { writeEvent, closeEventFiles } from "./serverEvents.js";
import { createAnalyticsRouter } from "./analytics.js";

export async function logEvent(time, event) {
  return writeEvent(time, event);
}

export async function shutDown() {
  await closeEventFiles();
}

/**
 * Returns an express middleware for hearald event tracking.
 * @param {Object} options
 * @param {string} [options.url='/e'] - The URL to listen for events.
 * @param {function} [options.parseBody] - Custom request body parser (req => {e, u, p}).
 * @returns {function} Express middleware
 */
export function eventEndpointMiddleware({ url = "/e", parseBody } = {}) {
  const router = express.Router();
  router.post(url, async (req, res) => {
    try {
      let e, u, p;
      if (parseBody) {
        ({ e, u, p } = parseBody(req));
      } else {
        ({ e = null, u = null, p = {} } = req.body || {});
        if (e === "visit") {
          p.ip = req.ip;
        }
      }
      await logEvent(nowAsPstDate(), { e, u, p });
    } catch (err) {
      // eslint-disable-next-line no-console
      log.error("error writing event to event log", err);
    }
    res.status(204).send();
  });
  return router;
}
