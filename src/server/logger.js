class Logger {
  constructor(level) {
    this.level = level || "info";
  }

  setLogLevel(level) {
    this.level = level;
  }

  debug(...args) {
    if (this.level === "debug") {
      console.log("[DEBUG]", ...args);
    }
  }

  info(...args) {
    if (this.level === "debug" || this.level === "info") {
      console.log("[INFO]", ...args);
    }
  }

  warn(...args) {
    if (this.level !== "error") {
      console.warn("[WARN]", ...args);
    }
  }

  error(...args) {
    console.error("[ERROR]", ...args);
  }
}

export default new Logger("error");
