import { iso, nowAsPstDate } from "../shared/utils.js";

class Configuration {
  constructor({
    nowFn = nowAsPstDate,
    isoFn = iso,
    logLevel = "warn",
    getUserId = (req) => req.user?.id,
    eventsDir = "events",
  } = {}) {
    this.nowFn = nowFn;
    this.isoFn = isoFn;
    this.logLevel = logLevel;
    this.getUserId = getUserId;
    this.eventsDir = eventsDir;
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

  setIsoFn(isoFn) {
    this.isoFn = isoFn;
  }
}

export default new Configuration();
