// Express middleware for hearald event tracking
import express from "express";

import hearaldConfiguration from "./configuration.js";
import log from "./logger.js";
import { writeEvent, closeEventFiles, VISIT_EVENT } from "./serverEvents.js";

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
        if (e === VISIT_EVENT) {
          p.ip = req.ip;
        }
      }
      await writeEvent(hearaldConfiguration.nowFn(), { e, u, p });
    } catch (err) {
      // eslint-disable-next-line no-console
      log.error("error writing event to event log", err);
    }
    res.status(204).send();
  });
  return router;
}

export async function trackServerEvent({
  event,
  time = null,
  userId,
  params = {},
}) {
  await writeEvent(time || hearaldConfiguration.nowFn(), {
    e: event,
    u: userId,
    p: params,
  });
}

export async function trackServerError({
  error,
  userId = null,
  extraParams = {},
}) {
  let message = "";
  let stack = "";
  if (error instanceof Error) {
    message = error.message;
    stack = error.stack || "";
  } else if (typeof error === "string") {
    message = error;
  } else if (error && typeof error === "object") {
    message = error.message || JSON.stringify(error);
    stack = error.stack || "";
  }
  const params = {
    message,
    stack,
    ...extraParams,
  };
  await writeEvent(hearaldConfiguration.nowFn(), {
    e: ERROR_EVENT,
    u: userId,
    p: params,
  });
}

// Express error-handling middleware
export function errorTrackingMiddleware({}) {
  // eslint-disable-next-line no-unused-vars
  return function (err, req, res, next) {
    trackServerError({
      error: err,
      userId: hearaldConfiguration.getUserId(req),
      extraParams: { url: req.originalUrl, method: req.method, ip: req.ip },
    });
    next(err);
  };
}
