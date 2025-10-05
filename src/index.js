import hearaldConfiguration from "./server/configuration.js";

import {
  eventEndpointMiddleware,
  trackServerEvent,
  trackServerError,
  errorTrackingMiddleware,
  shutDown,
} from "./server/server.js";
import { createAnalyticsRouter } from "./server/analytics.js";

export default function hearald({
  /* singleton configuration options */
  logLevel,
  nowFn /* () => nowAsDateString */,
  getUserId /* (req) => userId */,

  eventEndpoint: { url = "/e", parseBody } = {},
  analytics: { enabled: analyticsEnabled = true, statDefinitions } = {},
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

  const eventMiddleware = eventEndpointMiddleware({ url, parseBody });

  const analyticsMiddleware = analyticsEnabled
    ? createAnalyticsRouter({ statDefinitions })
    : null;

  const errorMiddlware = errorTrackingMiddleware({});

  return {
    errorMiddlware /* app.use(errorMiddlware) */,
    eventMiddleware /* app.use(eventMiddleware) */,
    analyticsMiddleware /* app.use('/analytics', analyticsMiddleware) */,
    trackServerEvent /* ({ event, time = null, userId, params = {} }) => Promise } */,
    trackServerError /* ({ error, userId = null, extraParams = {} }) => Promise } */,
    shutDown,
  };
}
