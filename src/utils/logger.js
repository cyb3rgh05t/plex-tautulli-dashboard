// ESM compatible logger with .env support for log level
// src/utils/logger.js

// Use dynamic import for chalk in ESM
import chalk from "chalk";

// Log level numeric values for comparison
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Initialize log level from environment variable if available
const getInitialLogLevel = () => {
  // Check if we're in a Node.js environment
  if (typeof process !== "undefined" && process.env) {
    const envLevel = process.env.LOG_LEVEL;
    if (envLevel && LOG_LEVELS[envLevel.toUpperCase()] !== undefined) {
      console.log(
        `Using log level from environment: ${envLevel.toUpperCase()}`
      );
      return LOG_LEVELS[envLevel.toUpperCase()];
    }
  }

  // Try to check for browser environment variables if available
  try {
    // Some bundlers might expose env through import.meta.env or window.__ENV__
    const browserEnv =
      (typeof import.meta !== "undefined" && import.meta.env?.LOG_LEVEL) ||
      (typeof window !== "undefined" && window.__ENV__?.LOG_LEVEL);

    if (browserEnv && LOG_LEVELS[browserEnv.toUpperCase()] !== undefined) {
      console.log(
        `Using log level from browser environment: ${browserEnv.toUpperCase()}`
      );
      return LOG_LEVELS[browserEnv.toUpperCase()];
    }
  } catch (err) {
    // Silently fail if import.meta is not supported
  }

  // Default to INFO
  console.log("Using default log level: INFO");
  return LOG_LEVELS.INFO;
};

// Default log level from environment or INFO
let currentLogLevel = getInitialLogLevel();

// In-memory log buffer
const logBuffer = [];
const maxBufferSize = 1000;

// Format timestamp without milliseconds
const formatTimestamp = (date) => {
  const pad = (num) => String(num).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

// Function to redact sensitive information
const redactSensitiveData = (data) => {
  if (typeof data === "object" && data !== null) {
    const redactedData = { ...data };
    const sensitiveKeys = [
      "plexToken",
      "tautulliApiKey",
      "password",
      "apiKey",
      "token",
    ];

    sensitiveKeys.forEach((key) => {
      if (redactedData.hasOwnProperty(key)) {
        redactedData[key] = "REDACTED";
      }
    });

    return redactedData;
  }
  return data;
};

// Add a log entry to buffer
const addToBuffer = (level, message, meta) => {
  const now = new Date();
  const logEntry = {
    timestamp: now.toISOString(), // Keep ISO format in buffer for sorting/filtering
    displayTimestamp: formatTimestamp(now), // Add formatted timestamp for display
    level: level.toLowerCase(),
    message,
    ...redactSensitiveData(meta),
  };

  logBuffer.push(logEntry);

  // Trim buffer if too large
  if (logBuffer.length > maxBufferSize) {
    logBuffer.shift();
  }

  return logEntry;
};

// Set the current log level
export const setLogLevel = (level) => {
  if (LOG_LEVELS[level] !== undefined) {
    currentLogLevel = LOG_LEVELS[level];
    // Log the change using info level
    logInfo(`Log level set to ${level}`);
    return true;
  }
  return false;
};

// Get the current log level name
export const getLogLevel = () => {
  return (
    Object.keys(LOG_LEVELS).find(
      (key) => LOG_LEVELS[key] === currentLogLevel
    ) || "INFO"
  );
};

// Get available log levels
export const getLogLevels = () => {
  return Object.keys(LOG_LEVELS);
};

// Clear the log buffer
export const clearLogs = () => {
  logBuffer.length = 0;
  return true;
};

// Get all logs
export const getLogs = () => {
  return [...logBuffer];
};

// Export logs as text
export const exportLogs = () => {
  return logBuffer
    .map((log) => {
      const errorInfo = log.error ? ` Error: ${log.error}` : "";
      return `[${log.displayTimestamp}] [${log.level.toUpperCase()}] ${
        log.message
      }${errorInfo}`;
    })
    .join("\n");
};

// Log error messages (always shown)
export const logError = (message, error = null) => {
  // Process error object
  const errorData = error ? redactSensitiveData(error) : null;
  const errorInfo =
    errorData?.message ||
    (errorData && typeof errorData === "object"
      ? JSON.stringify(errorData)
      : errorData);

  // Add to buffer with error details
  const entry = addToBuffer("error", message, {
    error: errorInfo,
    ...(error && error.stack ? { stack: error.stack } : {}),
  });

  // Log to console with color - apply same color to message
  console.error(
    chalk.red(`[ERROR] ${entry.displayTimestamp}:`),
    chalk.red(message),
    errorData ? errorData : ""
  );
};

// Log warning messages
export const logWarn = (message, meta = {}) => {
  if (currentLogLevel >= LOG_LEVELS.WARN) {
    const entry = addToBuffer("warn", message, meta);

    console.warn(
      chalk.yellow(`[WARN] ${entry.displayTimestamp}:`),
      chalk.yellow(message),
      Object.keys(meta).length ? meta : ""
    );
  }
};

// Log info messages
export const logInfo = (message, meta = {}) => {
  if (currentLogLevel >= LOG_LEVELS.INFO) {
    const entry = addToBuffer("info", message, meta);

    console.info(
      chalk.blue(`[INFO] ${entry.displayTimestamp}:`),
      chalk.blue(message),
      Object.keys(meta).length ? meta : ""
    );
  }
};

// Log debug messages
export const logDebug = (message, meta = {}) => {
  if (currentLogLevel >= LOG_LEVELS.DEBUG) {
    const entry = addToBuffer("debug", message, meta);

    console.debug(
      chalk.green(`[DEBUG] ${entry.displayTimestamp}:`),
      chalk.green(message),
      Object.keys(meta).length ? meta : ""
    );
  }
};

// Default export of all functions as an object
export default {
  logError,
  logWarn,
  logInfo,
  logDebug,
  setLogLevel,
  getLogLevel,
  getLogLevels,
  getLogs,
  clearLogs,
  exportLogs,
};
