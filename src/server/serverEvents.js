import { readFile, open as openFile, mkdir } from "fs/promises";

import hearaldConfiguration from "./configuration.js";
import log from "./logger.js";

export const VISIT_EVENT = "visit";
export const ERROR_EVENT = "error";

const eventFilePromises = new Map();
const lastWriteTimeouts = new Map();

export const openEventFile = async (fileName) => {
  await mkdir("events", { recursive: true });
  return openFile(`events/${fileName}.log`, "a");
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

  if (!eventFilePromises.has(fileName)) {
    eventFilePromises.set(fileName, openEventFile(fileName));
  }

  if (lastWriteTimeouts.has(fileName)) {
    clearTimeout(lastWriteTimeouts.get(fileName));
  }
  lastWriteTimeouts.set(
    fileName,
    setTimeout(() => closeEventFile(fileName), 60 * 1000)
  );

  const eventFile = await eventFilePromises.get(fileName);
  return eventFile.write(`${JSON.stringify({ t: time, ...event })}\n`);
};

export const closeEventFile = async (fileName) => {
  const eventFilePromise = eventFilePromises.get(fileName);
  eventFilePromises.delete(fileName);

  const timeout = lastWriteTimeouts.get(fileName);
  lastWriteTimeouts.delete(fileName);
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
    Array.from(eventFilePromises.keys()).map(async (fileName) =>
      closeEventFile(fileName)
    )
  );
};

export const readEventsFromFile = async (fileName) => {
  try {
    return (await readFile(`events/${fileName}.log`))
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
      log.warn(`file not found: events/${fileName}.log`);
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
