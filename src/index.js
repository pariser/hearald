import hearaldConfiguration from "./server/configuration.js";

import {
  eventEndpointMiddleware,
  trackServerEvent,
  trackServerError,
  errorTrackingMiddleware,
  shutDown,
} from "./server/server.js";
import { createAnalyticsRouter } from "./server/analytics.js";
import { purgeOldEvents } from "./server/serverEvents.js";
import { basicAuth } from "./server/auth.js";

export { basicAuth, purgeOldEvents };

export default function hearald({
  /* singleton configuration options */
  logLevel,
  nowFn /* () => nowAsDateString */,
  getUserId /* (req) => userId */,
  eventsDir /* where event logs are kept; default "events" */,

  eventEndpoint: { url = "/e", parseBody, schema } = {},
  analytics: {
    enabled: analyticsEnabled = true,
    statDefinitions,
    auth,
    allowUnauthenticated,
  } = {},
} = {}) {
  if (logLevel) {
    hearaldConfiguration.setLogLevel(logLevel);
  }
  if (nowFn) {
    hearaldConfiguration.setNowFn(nowFn);
  }
  if (getUserId) {
    hearaldConfiguration.setGetUserId(getUserId);
  }
  if (eventsDir) {
    hearaldConfiguration.setEventsDir(eventsDir);
  }

  const eventMiddleware = eventEndpointMiddleware({ url, parseBody, schema });

  const analyticsMiddleware =
    analyticsEnabled && statDefinitions
      ? createAnalyticsRouter({ statDefinitions, auth, allowUnauthenticated })
      : null;

  const errorMiddlware = errorTrackingMiddleware({});

  return {
    errorMiddlware /* app.use(errorMiddlware) */,
    eventMiddleware /* app.use(eventMiddleware) */,
    analyticsMiddleware /* app.use('/analytics', analyticsMiddleware) */,
    trackServerEvent /* ({ event, time = null, userId, params = {} }) => Promise } */,
    trackServerError /* ({ error, userId = null, extraParams = {} }) => Promise } */,
    purgeOldEvents /* ({ days }) => Promise<number of files removed> */,
    shutDown,
  };
}
