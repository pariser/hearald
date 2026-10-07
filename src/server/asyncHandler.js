// Express 4 does not catch a rejected promise from an async handler, so one failed read would be an
// unhandled rejection that kills the process. Express 5 does, but hearald supports both.
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve()
    .then(() => handler(req, res, next))
    .catch(next);
