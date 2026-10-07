import hearaldConfiguration from "./configuration.js";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

class Logger {
  constructor(config = hearaldConfiguration) {
    this.config = config;
  }

  enabled(level) {
    const configured = LEVELS[this.config.logLevel] ?? LEVELS.warn;
    return LEVELS[level] >= configured;
  }

  debug(...args) {
    if (this.enabled("debug")) console.log("[DEBUG]", ...args);
  }

  info(...args) {
    if (this.enabled("info")) console.log("[INFO]", ...args);
  }

  warn(...args) {
    if (this.enabled("warn")) console.warn("[WARN]", ...args);
  }

  error(...args) {
    console.error("[ERROR]", ...args);
  }
}

export { Logger };
export default new Logger(hearaldConfiguration);
