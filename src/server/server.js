// Express middleware for hearald event tracking
import express from "express";

import hearaldConfiguration from "./configuration.js";
import log from "./logger.js";
import {
  writeEvent,
  closeEventFiles,
  VISIT_EVENT,
  ERROR_EVENT,
} from "./serverEvents.js";
import { validateEvent } from "./validate.js";

export async function shutDown() {
  await closeEventFiles();
}

/**
 * Returns an express middleware for hearald event tracking.
 * @param {Object} options
 * @param {string} [options.url='/e'] - The URL to listen for events.
 * @param {function} [options.parseBody] - Custom request body parser (req => {e, u, p}).
 * @param {Object} [options.schema] - Allowed events and their parameters (see validate.js). When
 *   given, events not in it, and parameters not listed, are dropped. Strongly recommended for any
 *   endpoint that is open to the internet.
 * @returns {function} Express middleware
 */
export function eventEndpointMiddleware({ url = "/e", parseBody, schema } = {}) {
  const router = express.Router();
  router.post(url, async (req, res) => {
    try {
      let e, u, p;
      if (parseBody) {
        ({ e, u, p } = parseBody(req));
      } else {
        ({ e = null, u = null, p = {} } = req.body || {});
        if (p === null || typeof p !== "object" || Array.isArray(p)) p = {};
        if (e === VISIT_EVENT) {
          p = { ...p, ip: req.ip };
        }
      }
      if (schema) {
        const clean = validateEvent(schema, { e, u, p });
        if (!clean) {
          // Answer the same as for a good event, so the endpoint reveals nothing about the schema.
          res.status(204).send();
          return;
        }
        ({ e, u, p } = clean);
      }
      if (typeof e !== "string" || !e) {
        res.status(204).send();
        return;
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

// JSON.stringify throws on circular structures (and on BigInt); an error handler must not.
function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (e) {
    return String(value);
  }
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
    message = error.message || safeStringify(error);
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
    // Recording the error must never stop it reaching the app's own handler, nor crash the process
    // (a failed write is a rejected promise nobody awaits).
    try {
      trackServerError({
        error: err,
        userId: hearaldConfiguration.getUserId(req),
        extraParams: { url: req.originalUrl, method: req.method, ip: req.ip },
      }).catch((e) => log.error("could not record the error", e));
    } catch (e) {
      log.error("could not record the error", e);
    }
    next(err);
  };
}
