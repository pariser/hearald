// hearald/src/serverTrackError.js
// Server-side utility to track errors

export async function trackServerError({
  error,
  logEvent,
  userId = null,
  extraParams = {},
  nowFn = () => new Date(),
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
  await logEvent(nowFn(), { e: "error", u: userId, p: params });
}

// Express error-handling middleware
export function errorTrackingMiddleware({
  logEvent,
  nowFn = () => new Date(),
  userIdExtractor = (req) => req.user?.id,
}) {
  // eslint-disable-next-line no-unused-vars
  return function (err, req, res, next) {
    trackServerError({
      error: err,
      logEvent,
      userId: userIdExtractor(req),
      extraParams: { url: req.originalUrl, method: req.method, ip: req.ip },
      nowFn,
    });
    next(err);
  };
}
