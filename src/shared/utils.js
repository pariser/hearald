import hearaldConfiguration from "../server/configuration.js";

export const pacificTimeFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "America/Los_Angeles",
  timeZoneName: "short",
});

export const pacificTimeOffsetHours = (date) =>
  pacificTimeFormatter.format(date || new Date()).endsWith("PDT") ? -7 : -8;

export const nowAsPstDate = () => {
  const rawDate = new Date();
  const offset = pacificTimeOffsetHours(rawDate);
  const pstDate = new Date();
  pstDate.setUTCFullYear(
    rawDate.getUTCFullYear(),
    rawDate.getUTCMonth(),
    rawDate.getUTCDate()
  );
  pstDate.setUTCHours(-1 * offset);
  return pstDate;
};

export function omitProperties(object, ...keys) {
  let rest = object;
  keys.forEach((key) => {
    // eslint-disable-next-line no-unused-vars
    const { [key]: _omit, ...other } = rest;
    rest = other;
  });
  return rest;
}

export function iso(time) {
  return [
    time.getUTCFullYear(),
    (time.getUTCMonth() + 1).toString().padStart(2, "0"),
    time.getUTCDate().toString().padStart(2, "0"),
  ].join("-");
}

export function defaultEndDate() {
  const yesterday = hearaldConfiguration.nowFn();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday;
}
