import { iso, nowAsPstDate } from "../shared/utils.js";

class Configuration {
  constructor({
    nowFn = nowAsPstDate,
    isoFn = iso,
    logLevel = "warn",
    getUserId = (req) => req.user?.id,
    eventsDir = "events",
    idleCloseMs = 60 * 1000,
    maxWindowBytes = 64 * 1024 * 1024,
  } = {}) {
    this.nowFn = nowFn;
    this.isoFn = isoFn;
    this.logLevel = logLevel;
    this.getUserId = getUserId;
    this.eventsDir = eventsDir;
    this.idleCloseMs = idleCloseMs;
    this.maxWindowBytes = maxWindowBytes;
  }

  setLogLevel(level) {
    this.logLevel = level;
  }

  setNowFn(nowFn) {
    this.nowFn = nowFn;
  }

  setGetUserId(getUserId) {
    this.getUserId = getUserId;
  }

  setEventsDir(eventsDir) {
    this.eventsDir = eventsDir;
  }

  // How long an event file stays open after its last write
  setIdleCloseMs(idleCloseMs) {
    this.idleCloseMs = idleCloseMs;
  }

  // The most event-log bytes one dashboard request may read
  setMaxWindowBytes(maxWindowBytes) {
    this.maxWindowBytes = maxWindowBytes;
  }

  setIsoFn(isoFn) {
    this.isoFn = isoFn;
  }
}

export default new Configuration();
