import hearaldConfiguration from "./configuration.js";

class Logger {
  constructor(config = hearaldConfiguration) {
    this.config = config;
  }

  debug(...args) {
    if (this.config.logLevel === "debug") {
      console.log("[DEBUG]", ...args);
    }
  }

  info(...args) {
    if (this.config.logLevel === "debug" || this.config.logLevel === "info") {
      console.log("[INFO]", ...args);
    }
  }

  warn(...args) {
    if (this.config.logLevel !== "error") {
      console.warn("[WARN]", ...args);
    }
  }

  error(...args) {
    console.error("[ERROR]", ...args);
  }
}

export default new Logger("error");
