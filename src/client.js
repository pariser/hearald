import { EventBus } from "bussin-js";

// Shared event bus for all tracking events
export const eventBus = new EventBus([]);

function trackEvent({ eventName, userId = null, payload = {} } = {}) {
  eventBus.emit("event", { eventName, userId, payload });
}

const generateVisitorData = () => ({
  user_agent: navigator.userAgent || "unknown",
  referrer: document.referrer || "none",
  url: window.location.toString(),
  screen_resolution: `${screen.width}x${screen.height}`,
  window_resolution: `${window.innerWidth}x${window.innerHeight}`,
});

const trackError = ({
  error,
  userId = null,
  payload: extraPayload = {},
} = {}) => {
  const errorEvent = error;
  const errorObject = error.error;

  let source;
  if (errorObject.stack) {
    const splitStack = errorObject.stack.split("\n");
    if (splitStack.length > 2) {
      source = splitStack[1].trim();
    }
  }

  trackEvent({
    eventName: "error",
    userId,
    payload: {
      message: errorObject.message,
      source,
      file_name: errorEvent.filename || errorObject.fileName,
      line_number: errorEvent.lineno || errorObject.lineNumber,
      column_number: errorEvent.colno || errorObject.columnNumber,
      ...generateVisitorData(),
      ...extraPayload,
    },
  });
};

const trackVisit = ({ userId, payload: extraPayload = {} } = {}) => {
  trackEvent({
    eventName: "visit",
    userId,
    payload: {
      ...generateVisitorData(),
      ...extraPayload,
    },
  });
};

function emitEventToServer({
  endpoint = "/e",
  eventName,
  userId,
  payload = {},
  fetchImpl = fetch,
}) {
  return fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ e: eventName, u: userId, p: payload }),
  });
}

export default function hearald({
  endpoint = "/e",
  fetchImpl = fetch,
  getUserId = () => null,
  onError = () => {} /* err, eventName, userId, payload */,
} = {}) {
  eventBus.on("event", async (event) => {
    const { eventName, userId: emittedUserId, payload } = event;
    const userId = emittedUserId || getUserId() || null;

    try {
      await emitEventToServer({
        endpoint,
        eventName,
        userId,
        payload,
        fetchImpl,
      });
    } catch (err) {
      onError(err, eventName, userId, payload);
    }
  });

  return {
    eventBus,
    trackEvent,
    trackError,
    trackVisit,
  };
}
