import {
  readFile,
  readdir,
  unlink,
  stat,
  open as openFile,
  mkdir,
} from "fs/promises";
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

// A crash can leave the last line unfinished. Appending straight after it would glue the next event
// onto the broken line and lose both, so start a fresh line first.
const endWithNewline = async (file) => {
  const { size } = await file.stat();
  if (size === 0) return;
  const last = Buffer.alloc(1);
  await file.read(last, 0, 1, size - 1);
  if (last[0] !== 0x0a) await file.write("\n");
};

export const openEventFile = async (fileName) => {
  await mkdir(hearaldConfiguration.eventsDir, { recursive: true });
  // "a+" appends like "a" but lets us look at the end of the file first
  const file = await openFile(eventFilePath(fileName), "a+");
  try {
    await endWithNewline(file);
  } catch (e) {
    await file.close();
    throw e;
  }
  return file;
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
    const opening = openEventFile(fileName);
    eventFilePromises.set(key, opening);
    // A failed open must not stay cached: every later write would fail with it, and closing it
    // from the idle timer would be an unhandled rejection that kills the process.
    opening.catch(() => {
      if (eventFilePromises.get(key) === opening) {
        eventFilePromises.delete(key);
        clearIdleTimer(key);
      }
    });
  }

  clearIdleTimer(key);
  // Close by the key captured now: the events directory may have changed by the time this fires.
  const timer = setTimeout(
    () => closeByKey(key),
    hearaldConfiguration.idleCloseMs
  );
  timer.unref(); // an idle file handle must not keep a script alive
  lastWriteTimeouts.set(key, timer);

  const eventFile = await eventFilePromises.get(key);
  return eventFile.write(`${JSON.stringify({ t: time, ...event })}\n`);
};

function clearIdleTimer(key) {
  const timeout = lastWriteTimeouts.get(key);
  lastWriteTimeouts.delete(key);
  if (timeout) clearTimeout(timeout);
}

// Never rejects: it runs from timers and shutdown, where nobody could catch it. A failed open was
// already reported to the writer that asked for it.
async function closeByKey(key) {
  const eventFilePromise = eventFilePromises.get(key);
  eventFilePromises.delete(key);
  clearIdleTimer(key);
  if (!eventFilePromise) return;
  try {
    await (await eventFilePromise).close();
  } catch (e) {
    log.debug(`could not close ${key}: ${e.message}`);
  }
}

// How many event files are open or opening (for tests and diagnostics).
export const openEventFileCount = () => eventFilePromises.size;

export const closeEventFile = (fileName) =>
  closeByKey(eventFilePath(fileName));

export const closeEventFiles = async () => {
  await Promise.all(Array.from(eventFilePromises.keys()).map(closeByKey));
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
    if (e.code === "ENOENT") {
      // a day with no events has no file; that is normal
      log.debug(`no events file: ${eventFilePath(fileName)}`);
    } else {
      // eslint-disable-next-line no-console
      log.error(e);
    }
    return [];
  }
};

// The file names of the n days ending on d (UTC fields, like `iso`).
export const windowFileNames = (d, n, fileSuffix) => {
  const names = [];
  for (let i = 0; i < n; i++) {
    // `iso` reads the UTC fields, so step back in UTC too (local-time maths skips or repeats a day
    // around daylight saving changes on servers not set to UTC)
    const newDate = new Date(d);
    newDate.setUTCDate(d.getUTCDate() - i);
    let fileName = hearaldConfiguration.isoFn(newDate);
    if (fileSuffix) {
      fileName += `-${fileSuffix}`;
    }
    names.push(fileName);
  }
  return names;
};

// Total size in bytes of the event files for a window, so a window too big for memory can be refused
// before anything is read.
export const windowBytes = async (d, n, fileSuffix) => {
  let total = 0;
  for (const fileName of windowFileNames(d, n, fileSuffix)) {
    try {
      total += (await stat(eventFilePath(fileName))).size;
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  return total;
};

export const loadEventsOverWindow = async (d, n, fileSuffix) => {
  const events = [];
  for (const fileName of windowFileNames(d, n, fileSuffix)) {
    // push, not spreading into a new array each day, which is quadratic
    for (const event of await readEventsFromFile(fileName)) events.push(event);
  }
  return events;
};

// Deletes event logs and cached summaries older than `days` days (by the date in the file name; a
// file dated exactly `days` days ago is kept). Counts days with the configured clock. Returns the number of files removed. Run it nightly to honour a retention period.
export const purgeOldEvents = async ({
  days,
  now = hearaldConfiguration.nowFn(),
} = {}) => {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error("purgeOldEvents needs a whole number of days, 1 or more");
  }
  // UTC fields, like `isoFn`; local-time maths could be off by a day around daylight saving changes
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
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
      /^summary:(\d{4}-\d{2}-\d{2}):\d+(?::[0-9a-f]+)?\.json$/.exec(name);
    if (match && match[1] < cutoffIso) {
      await closeEventFile(name.replace(/\.log$/, ""));
      await unlink(join(hearaldConfiguration.eventsDir, name));
      removed += 1;
    }
  }
  return removed;
};
