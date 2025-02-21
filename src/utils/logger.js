const LOG_LEVELS = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
};

// Function to redact sensitive information
const redactSensitiveData = (data) => {
  if (typeof data === "object" && data !== null) {
    const redactedData = { ...data };

    // List of keys to redact
    const sensitiveKeys = [
      "plexToken",
      "tautulliApiKey",
      "password",
      "apiKey",
      "token",
    ];

    sensitiveKeys.forEach((key) => {
      if (redactedData.hasOwnProperty(key)) {
        // Replace with REDACTED
        redactedData[key] = "REDACTED";
      }
    });

    return redactedData;
  }
  return data;
};

class Logger {
  constructor() {
    this.isDevelopment = import.meta.env.DEV;
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level,
      message,
      ...redactSensitiveData(meta),
    };
  }

  error(message, error = null) {
    const formattedMessage = this.formatMessage(LOG_LEVELS.ERROR, message, {
      error: error ? redactSensitiveData(error) : null,
    });
    console.error(formattedMessage);
    // In production, you might want to send this to a logging service
    if (!this.isDevelopment) {
      // Send to logging service if needed
    }
  }

  warn(message, meta = {}) {
    const formattedMessage = this.formatMessage(LOG_LEVELS.WARN, message, meta);
    console.warn(formattedMessage);
  }

  info(message, meta = {}) {
    const formattedMessage = this.formatMessage(LOG_LEVELS.INFO, message, meta);
    console.info(formattedMessage);
  }

  debug(message, meta = {}) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage(
        LOG_LEVELS.DEBUG,
        message,
        meta
      );
      console.debug(formattedMessage);
    }
  }
}

const logger = new Logger();

export const logError = (message, error = null) => logger.error(message, error);
export const logWarn = (message, meta = {}) => logger.warn(message, meta);
export const logInfo = (message, meta = {}) => logger.info(message, meta);
export const logDebug = (message, meta = {}) => logger.debug(message, meta);

export default logger;
