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
  // `error` is normally the ErrorEvent from window.onerror, whose `.error` can be null (for example
  // for errors from other origins), or a plain Error.
  const errorEvent = error || {};
  const errorObject = errorEvent.error || (error instanceof Error ? error : {});

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
      message: errorObject.message || errorEvent.message || String(error),
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

let activeListener = null;

export default function hearald({
  endpoint = "/e",
  fetchImpl = (...args) => globalThis.fetch(...args),
  getUserId = () => null,
  onError = () => {} /* err, eventName, userId, payload */,
} = {}) {
  // The event bus is shared, so a second call (a hot reload, say) replaces the first listener
  // instead of sending every event twice.
  if (activeListener) eventBus.off("event", activeListener);
  const listener = async (event) => {
    const { eventName, userId: emittedUserId, payload } = event;
    const userId = emittedUserId || getUserId() || null;

    try {
      const response = await emitEventToServer({
        endpoint,
        eventName,
        userId,
        payload,
        fetchImpl,
      });
      // fetch only rejects on network failure; a 404 or 500 arrives as an ordinary response
      if (response && response.ok === false) {
        throw new Error(
          `hearald: the server answered ${response.status} for "${eventName}"`
        );
      }
    } catch (err) {
      onError(err, eventName, userId, payload);
    }
  };
  activeListener = listener;
  eventBus.on("event", listener);

  return {
    // Removes only this instance's listener: an older instance's dispose() must not silence a newer one.
    dispose() {
      eventBus.off("event", listener);
      if (activeListener === listener) activeListener = null;
    },
    eventBus,
    trackEvent,
    trackError,
    trackVisit,
  };
}
