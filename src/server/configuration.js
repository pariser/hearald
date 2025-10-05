import { iso, nowAsPstDate } from "../shared/utils.js";

class Configuration {
  constructor({
    nowFn = nowAsPstDate,
    isoFn = iso,
    logLevel = "info",
    getUserId = (req) => req.user?.id,
  } = {}) {
    this.nowFn = nowFn;
    this.isoFn = isoFn;
    this.logLevel = logLevel;
    this.getUserId = getUserId;
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

  setIsoFn(isoFn) {
    this.isoFn = isoFn;
  }
}

export default new Configuration();
