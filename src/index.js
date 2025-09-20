import log from "./server/logger.js";
import { eventEndpointMiddleware, shutDown } from "./server/server.js";
import { createAnalyticsRouter } from "./server/analytics.js";

export default function hearald({
  logLevel,
  eventEndpoint: { url = "/e", parseBody } = {},
  analytics: { enabled: analyticsEnabled = true, statDefinitions } = {},
} = {}) {
  if (logLevel) {
    log.setLogLevel(logLevel);
  }

  const eventMiddleware = eventEndpointMiddleware({ url, parseBody });

  const analyticsMiddleware = analyticsEnabled
    ? createAnalyticsRouter({ statDefinitions })
    : null;

  return {
    eventMiddleware,
    analyticsMiddleware,
    shutDown,
  };
}
