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

// A Date whose UTC fields hold the current Pacific wall-clock time, so `iso()` (which reads UTC
// fields) names the Pacific day. The instant it represents is not "now"; it is only for day buckets.
export const nowAsPstDate = (now = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  return new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
      now.getMilliseconds()
    )
  );
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

// Midnight (UTC fields) at the start of yesterday, in the same day buckets as nowAsPstDate.
export function defaultEndDate(now = nowAsPstDate()) {
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  return yesterday;
}
