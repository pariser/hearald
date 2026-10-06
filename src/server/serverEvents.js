import { readFile, readdir, unlink, open as openFile, mkdir } from "fs/promises";
import { join } from "path";

import hearaldConfiguration from "./configuration.js";
import log from "./logger.js";

export const VISIT_EVENT = "visit";
export const ERROR_EVENT = "error";

const eventFilePromises = new Map();
const lastWriteTimeouts = new Map();

// Events live in hearaldConfiguration.eventsDir (default "events", relative to the working directory).
export const eventFilePath = (fileName) =>
  join(hearaldConfiguration.eventsDir, `${fileName}.log`);

export const openEventFile = async (fileName) => {
  await mkdir(hearaldConfiguration.eventsDir, { recursive: true });
  return openFile(eventFilePath(fileName), "a");
};

export const writeEvent = async (time, event) => {
  let fileName;

  const dateString = hearaldConfiguration.isoFn(time);

  if (event.e === VISIT_EVENT) {
    fileName = `${dateString}-visits`;
  } else if (event.e === ERROR_EVENT) {
    fileName = `${dateString}-errors`;
  } else {
    fileName = dateString;
  }

  const key = eventFilePath(fileName);
  if (!eventFilePromises.has(key)) {
    eventFilePromises.set(key, openEventFile(fileName));
  }

  if (lastWriteTimeouts.has(key)) {
    clearTimeout(lastWriteTimeouts.get(key));
  }
  lastWriteTimeouts.set(
    key,
    setTimeout(() => closeEventFile(fileName), 60 * 1000)
  );

  const eventFile = await eventFilePromises.get(key);
  return eventFile.write(`${JSON.stringify({ t: time, ...event })}\n`);
};

export const closeEventFile = async (fileName) => {
  const key = eventFilePath(fileName);
  const eventFilePromise = eventFilePromises.get(key);
  eventFilePromises.delete(key);

  const timeout = lastWriteTimeouts.get(key);
  lastWriteTimeouts.delete(key);
  if (timeout) {
    clearTimeout(timeout);
  }

  if (eventFilePromise) {
    return (await eventFilePromise).close();
  }
  return undefined;
};

export const closeEventFiles = async () => {
  return Promise.all(
    Array.from(eventFilePromises.entries()).map(async ([key, promise]) => {
      eventFilePromises.delete(key);
      const timeout = lastWriteTimeouts.get(key);
      lastWriteTimeouts.delete(key);
      if (timeout) clearTimeout(timeout);
      return (await promise).close();
    })
  );
};

export const readEventsFromFile = async (fileName) => {
  try {
    return (await readFile(eventFilePath(fileName)))
      .toString("utf8")
      .split("\n")
      .filter((r) => r.trim())
      .map((row) => {
        try {
          return JSON.parse(row);
        } catch (e) {
          // skip malformed lines
          return undefined;
        }
      })
      .filter(Boolean);
  } catch (e) {
    if (e.message && e.message.indexOf("ENOENT") !== -1) {
      // eslint-disable-next-line no-console
      log.warn(`file not found: ${eventFilePath(fileName)}`);
    } else {
      // eslint-disable-next-line no-console
      log.error(e);
    }
    return [];
  }
};

export const loadEventsOverWindow = async (d, n, fileSuffix) => {
  let events = [];
  for (let i = 0; i < n; i++) {
    const newDate = new Date(d);
    newDate.setDate(d.getDate() - i);
    let fileName = hearaldConfiguration.isoFn(newDate);
    if (fileSuffix) {
      fileName += `-${fileSuffix}`;
    }
    events = [...events, ...(await readEventsFromFile(fileName))];
  }
  return events;
};

// Deletes event logs and cached summaries older than `days` days (by the date in the file name).
// Returns the number of files removed. Run it nightly to honour a retention period.
export const purgeOldEvents = async ({ days, now = new Date() } = {}) => {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error("purgeOldEvents needs a whole number of days, 1 or more");
  }
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = hearaldConfiguration.isoFn(cutoff);

  let names;
  try {
    names = await readdir(hearaldConfiguration.eventsDir);
  } catch (e) {
    if (e.code === "ENOENT") return 0;
    throw e;
  }
  let removed = 0;
  for (const name of names) {
    const match =
      /^(\d{4}-\d{2}-\d{2})(?:-[a-z]+)?\.log$/.exec(name) ||
      /^summary:(\d{4}-\d{2}-\d{2}):\d+\.json$/.exec(name);
    if (match && match[1] < cutoffIso) {
      await closeEventFile(name.replace(/\.log$/, ""));
      await unlink(join(hearaldConfiguration.eventsDir, name));
      removed += 1;
    }
  }
  return removed;
};
