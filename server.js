import "dotenv/config";
import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import { getConfig, setConfig } from "./src/utils/configStore.js";
import { getFormats, saveFormats } from "./src/utils/formatStore.js";
import {
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
} from "./src/utils/logger.js";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk"; // Adding chalk for colored output in server banner

// Set log level from environment variable or config
setLogLevel(process.env.LOG_LEVEL || "INFO");

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================================================================
// Constants and Configuration
// ======================================================================
const SAVED_SECTIONS_PATH = path.join(
  process.cwd(),
  "configs",
  "sections.json"
);
const PROXY_TIMEOUT = parseInt(process.env.PROXY_TIMEOUT) || 30000;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3005"];

// Plex headers configuration
const PLEX_HEADERS = [
  "x-plex-client-identifier",
  "x-plex-product",
  "x-plex-version",
  "x-plex-platform",
  "x-plex-platform-version",
  "x-plex-device",
  "x-plex-device-name",
  "x-plex-token",
  "x-plex-language",
];

// CORS Configuration
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", ...PLEX_HEADERS],
  exposedHeaders: ["Access-Control-Allow-Origin"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// ======================================================================
// Utility Functions
// ======================================================================

// Version Management
function getAppVersion() {
  try {
    const versionFilePath = path.join(__dirname, "version.js");
    const versionFileContent = fs.readFileSync(versionFilePath, "utf8");
    const versionMatch = versionFileContent.match(/appVersion = "([^"]+)"/);
    return versionMatch && versionMatch[1] ? versionMatch[1] : "unknown";
  } catch (error) {
    logError("Error reading version", error);
    return "unknown";
  }
}

// Directory Management
const ensureDirectories = () => {
  const dirs = [path.dirname(SAVED_SECTIONS_PATH)];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logInfo(`Created directory: ${dir}`);
    }
  });
};

// ======================================================================
// Formatting Utilities
// ======================================================================

const formatDate = (timestamp, format = "default") => {
  // Return early if no timestamp
  if (!timestamp) return "Never";

  let date;

  try {
    // Handle ISO date strings (YYYY-MM-DD)
    if (typeof timestamp === "string" && timestamp.includes("-")) {
      date = new Date(timestamp);
    }
    // Handle numeric timestamps
    else if (typeof timestamp === "number" || !isNaN(Number(timestamp))) {
      const ts = typeof timestamp === "number" ? timestamp : Number(timestamp);
      // If timestamp is smaller than year 2100 in seconds, assume it's in seconds
      date = ts < 4294967296 ? new Date(ts * 1000) : new Date(ts);
    }
    // Fallback
    else {
      date = new Date(timestamp);
    }
  } catch (e) {
    logError(`Error parsing date: ${timestamp}`, e);
    return "Invalid Date";
  }

  // Ensure we have a valid date
  if (isNaN(date.getTime())) {
    logWarn(`Invalid date from timestamp: ${timestamp}`);
    return "Invalid Date";
  }

  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  switch (format) {
    case "short":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

    case "relative":
      if (diffSeconds < 0) return date.toLocaleDateString();

      if (diffYears > 0) {
        return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
      }

      if (diffMonths > 0) {
        return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
      }

      if (diffDays > 0) {
        return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
      }

      if (diffHours > 0) {
        return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
      }

      if (diffMinutes > 0) {
        return diffMinutes === 1
          ? "1 minute ago"
          : `${diffMinutes} minutes ago`;
      }

      return diffSeconds === 1 ? "1 second ago" : `${diffSeconds} seconds ago`;

    case "full":
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    case "time":
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

    default:
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
  }
};

const formatDuration = (durationMs) => {
  // Ensure we have a valid input
  if (!durationMs) return "0m";

  let duration;

  // Handle string inputs that might already be formatted
  if (typeof durationMs === "string") {
    // If it's already in the format we want, return it
    if (/^\d+h( \d+m)?$|^\d+m$/.test(durationMs.trim())) {
      return durationMs.trim();
    }

    // If it's a number in string format, parse it
    duration = Number(durationMs);
  } else {
    duration = Number(durationMs);
  }

  // If duration is invalid or 0, return "0m"
  if (isNaN(duration) || duration <= 0) return "0m";

  // If duration is in seconds, convert to milliseconds
  if (duration > 0 && duration < 10000) {
    duration *= 1000;
  }

  // Convert milliseconds to minutes
  const totalMinutes = Math.floor(duration / 60000);

  // Calculate hours and remaining minutes
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Format the output
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
};

const formatArray = (arr) => {
  if (!arr || !Array.isArray(arr)) return "";
  return arr.join(", ");
};

function formatTimeHHMM(milliseconds) {
  if (!milliseconds) return "00:00";

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

function formatTimeDiff(timestamp) {
  if (!timestamp) return "Never";

  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Helper for two-digit padding
const padTwoDigits = (num) => String(num).padStart(2, "0");

// Format show episode helper
const formatShowEpisode = (seasonNumber, episodeNumber) => {
  const paddedSeason = padTwoDigits(seasonNumber);
  const paddedEpisode = padTwoDigits(episodeNumber);
  return `S${paddedSeason}E${paddedEpisode}`;
};

// Template processing
const processTemplate = (template, data) => {
  if (!template) return "";

  let result = template;
  const variables = template.match(/\{([^}]+)\}/g) || [];

  variables.forEach((variable) => {
    // Extract variable and optional format
    const match = variable.slice(1, -1).split(":");
    const key = match[0];
    const format = match[1] || "default"; // Add default format if not specified

    let value;

    try {
      // Special handling for timestamps with various naming conventions
      if (
        [
          "addedAt",
          "added_at",
          "last_seen",
          "updated_at",
          "last_viewed_at",
          "originally_available_at",
        ].includes(key)
      ) {
        const timestamp = data[key];
        value = formatDate(timestamp, format);
      }
      // Special handling for duration
      else if (key === "duration") {
        value = formatDuration(data[key]);
      }
      // Special handling for show episode formatting
      else if (
        data.mediaType === "episode" &&
        (key === "parent_media_index" || key === "media_index")
      ) {
        // Continue with the special episode formatting logic
        value = formatShowEpisode(data.parent_media_index, data.media_index);

        // Replace the entire combined pattern with the formatted episode string
        if (result.includes("{parent_media_index}E{media_index}")) {
          result = result.replace(
            /\{parent_media_index\}E\{media_index\}/,
            value
          );
          return; // Skip the normal replacement for this variable
        }

        // If we're here, it's just a single index being used, so we'll format it as S01 or E05
        if (key === "parent_media_index") {
          value = "S" + String(data[key] || "0").padStart(2, "0");
        } else if (key === "media_index") {
          value = "E" + String(data[key] || "0").padStart(2, "0");
        }
      }
      // Default handling
      else {
        value = data[key];
      }
    } catch (error) {
      logError(`Error processing template variable ${key}:`, error);
      value = ""; // Default to empty string on error
    }

    if (value !== undefined) {
      result = result.replace(variable, value);
    }
  });

  return result;
};

// Enhanced template processing with full support for season/episode formatting
const enhancedProcessTemplate = (template, data) => {
  if (!template) return "";

  let result = template;
  const variables = template.match(/\{([^}]+)\}/g) || [];

  variables.forEach((variable) => {
    const match = variable.slice(1, -1).split(":");
    const key = match[0];
    const format = match[1] || "default";

    let value;

    // Special handling for timestamp
    if (key === "addedAt" || key === "added_at") {
      const timestamp = data.addedAt || data.added_at;
      value = formatDate(timestamp, format);
    }
    // Special handling for duration
    else if (key === "duration") {
      value = data.formatted_duration || formatDuration(Number(data[key]) || 0);
    }
    // Special handling for season and episode numbers
    else if (key === "parent_media_index" || key === "media_index") {
      // Get raw value with fallback to "0"
      const rawValue = data[key] || "0";

      // Parse to number (important for proper padding)
      const numberValue =
        typeof rawValue === "number" ? rawValue : parseInt(rawValue, 10);

      // Apply 2-digit padding
      value = String(numberValue).padStart(2, "0");

      // Add S or E prefix for show/episode media types
      if (data.media_type === "show" || data.media_type === "episode") {
        if (key === "parent_media_index") {
          value = `S${value}`;
        } else if (key === "media_index") {
          value = `E${value}`;
        }
      }
    }
    // Default handling for all other variables
    else {
      value = data[key];
    }

    if (value !== undefined) {
      result = result.replace(variable, value);
    }
  });

  return result;
};

// Format media with custom formats
const formatMediaWithCustomFormats = (media, formats, sectionId = "all") => {
  const applicableFormats = formats.filter(
    (format) =>
      format.sectionId === "all" || format.sectionId === sectionId.toString()
  );

  const formattedData = {};
  applicableFormats.forEach((format) => {
    formattedData[format.name] = processTemplate(format.template, media);
  });

  return {
    ...media,
    formatted: formattedData,
  };
};

// Format library with custom formats
function formatLibraryWithCustomFormats(library, formats) {
  const applicableFormats = formats.filter((format) => {
    // Map section_type to media type for matching
    const sectionType = (
      library.section_type ||
      library.type ||
      ""
    ).toLowerCase();
    let mediaType = null;

    if (sectionType === "movie") mediaType = "movies";
    if (sectionType === "show") mediaType = "shows";
    if (sectionType === "artist") mediaType = "music";

    // Match by section ID AND media type
    const sectionMatches =
      format.sectionId === "all" ||
      format.sectionId === library.section_id.toString();

    const mediaTypeMatches =
      !format.mediaType || format.mediaType === mediaType;

    return sectionMatches && mediaTypeMatches;
  });

  const formattedData = {};
  applicableFormats.forEach((format) => {
    formattedData[format.name] = processTemplate(format.template, library);
  });

  return {
    ...library,
    formatted: formattedData,
  };
}

// Format show title with season and episode
function formatShowTitle(session) {
  if (!session) return "";

  if (
    session.grandparent_title &&
    session.parent_media_index &&
    session.media_index
  ) {
    // Remove year from grandparent_title (show name)
    const showTitle = session.grandparent_title.replace(
      /\s*\(\d{4}\)|\s+[-–]\s+\d{4}/,
      ""
    );
    return `${showTitle} - S${String(session.parent_media_index).padStart(
      2,
      "0"
    )}E${String(session.media_index).padStart(2, "0")}`;
  }

  const title = session.title || "";
  return title.replace(/\s*\(\d{4}\)|\s+[-–]\s+\d{4}/, "");
}

// ======================================================================
// API Services
// ======================================================================

// Get library details (stats & watch time)
const getLibraryDetails = async (sectionId, config) => {
  try {
    // Get library stats and watch statistics in parallel
    const [statsResponse, watchStatsResponse] = await Promise.all([
      axios.get(`${config.tautulliUrl}/api/v2`, {
        params: {
          apikey: config.tautulliApiKey,
          cmd: "get_library_media_info",
          section_id: sectionId,
        },
      }),
      axios.get(`${config.tautulliUrl}/api/v2`, {
        params: {
          apikey: config.tautulliApiKey,
          cmd: "get_library_watch_time_stats",
          section_id: sectionId,
        },
      }),
    ]);

    const stats = statsResponse.data?.response?.data || {};
    const watchStats = watchStatsResponse.data?.response?.data || {};

    return {
      count: stats.count || 0,
      parent_count: stats.parent_count || 0,
      child_count: stats.child_count || 0,
      total_plays: watchStats.total_plays || 0,
      last_accessed: watchStats.last_accessed || null,
      last_played: watchStats.last_played || null,
    };
  } catch (error) {
    logError(`Error fetching library details for section ${sectionId}:`, error);
    return {
      count: 0,
      parent_count: 0,
      child_count: 0,
      total_plays: 0,
      last_accessed: null,
      last_played: null,
    };
  }
};

// Get user history from Tautulli API
// Enhanced getUserHistory function that also fetches media metadata
async function getUserHistoryWithMetadata(
  baseUrl,
  apiKey,
  userId,
  requestId = ""
) {
  try {
    logDebug(`[${requestId}] Fetching history for user ${userId}...`);

    const response = await axios.get(`${baseUrl}/api/v2`, {
      params: {
        apikey: apiKey,
        cmd: "get_history",
        user_id: userId,
        length: 1,
      },
      timeout: 10000, // 10 second timeout
    });

    const historyItem = response.data?.response?.data?.data?.[0] || null;

    if (historyItem) {
      logDebug(
        `[${requestId}] History fetch success for ${userId}: ${historyItem.media_type}: ${historyItem.title}`
      );

      // If we have a history item with a rating key, fetch the media metadata to get duration
      if (historyItem.rating_key) {
        try {
          logDebug(
            `[${requestId}] Fetching metadata for item ${historyItem.rating_key}...`
          );

          const metadataResponse = await axios.get(`${baseUrl}/api/v2`, {
            params: {
              apikey: apiKey,
              cmd: "get_metadata",
              rating_key: historyItem.rating_key,
            },
            timeout: 5000,
          });

          // Get the actual media duration from metadata
          const mediaInfo = metadataResponse.data?.response?.data;
          if (mediaInfo && mediaInfo.duration) {
            historyItem.media_duration = mediaInfo.duration; // Add the media duration to history item
            logDebug(
              `[${requestId}] Got media duration for ${historyItem.title}: ${mediaInfo.duration}ms`
            );
          } else {
            logDebug(
              `[${requestId}] No duration found in metadata for ${historyItem.title}`
            );
          }
        } catch (error) {
          logError(
            `[${requestId}] Error fetching metadata for ${historyItem.rating_key}:`,
            error
          );
        }
      }
    } else {
      logDebug(`[${requestId}] No history found for user ${userId}`);
    }

    return historyItem;
  } catch (error) {
    logError(
      `[${requestId}] Error fetching history for user ${userId}:`,
      error
    );
    return null;
  }
}

// ======================================================================
// Caching System
// ======================================================================

// Generic cache factory to create different cache instances
const createCache = (defaultTTL = 10 * 60 * 1000) => {
  return {
    cache: new Map(),
    ttl: defaultTTL,

    get(key) {
      const item = this.cache.get(key);
      if (!item) return null;

      // Check if cached item has expired
      if (Date.now() > item.expires) {
        this.cache.delete(key);
        return null;
      }

      return item.value;
    },

    set(key, value, ttl = this.ttl) {
      this.cache.set(key, {
        value,
        expires: Date.now() + ttl,
      });
    },

    delete(key) {
      this.cache.delete(key);
    },

    clear() {
      this.cache.clear();
    },

    keys() {
      return Array.from(this.cache.keys());
    },

    stats() {
      return {
        size: this.cache.size,
        keys: this.keys(),
      };
    },
  };
};

// Create specific cache instances
const historyCache = createCache(10 * 60 * 1000); // 10 minutes
const mediaCache = createCache(10 * 60 * 1000); // 10 minutes - increased cache time
const metadataCache = createCache(30 * 60 * 1000); // 30 minutes

// Track ongoing background refreshes to prevent duplicates
const pendingRefreshes = new Map();

// Function to refresh cache in the background without blocking the current request
const refreshCacheInBackground = async (type, section, count) => {
  const config = getConfig();
  if (!config.tautulliUrl || !config.tautulliApiKey) return false;

  // Create a unique key for this refresh
  const refreshKey = `refresh:${type}:${section || "all"}`;

  // If already refreshing this data, skip
  if (pendingRefreshes.has(refreshKey)) return false;

  // Mark as pending
  pendingRefreshes.set(refreshKey, Date.now());

  try {
    const validTypes = {
      movies: "movie",
      shows: "show",
      music: "artist",
    };

    if (!validTypes[type]) return false;

    // Get sections first to identify what needs refreshing
    const sectionsResponse = await axios.get(`${config.tautulliUrl}/api/v2`, {
      params: {
        apikey: config.tautulliApiKey,
        cmd: "get_libraries_table",
      },
    });

    const allSections = sectionsResponse.data?.response?.data?.data || [];

    // Filter sections by type and optional section ID
    const matchingSections = allSections.filter((s) => {
      const sectionType = (s.section_type || s.type || "")
        .toString()
        .toLowerCase();
      const matchesType = sectionType === validTypes[type];

      if (section) {
        return matchesType && s.section_id.toString() === section.toString();
      }

      return matchesType;
    });

    // Fetch and cache section media
    for (const section of matchingSections) {
      const sectionCacheKey = `section:${section.section_id}:media`;

      // Fetch from API
      const response = await axios.get(`${config.tautulliUrl}/api/v2`, {
        params: {
          apikey: config.tautulliApiKey,
          cmd: "get_recently_added",
          section_id: section.section_id,
          count: 50,
        },
      });

      const sectionMedia = (
        response.data?.response?.data?.recently_added || []
      ).map((item) => ({
        ...item,
        section_id: section.section_id,
        section_name: section.section_name || section.name,
      }));

      // Cache the section media
      mediaCache.set(sectionCacheKey, sectionMedia);
      logDebug(
        `Background refresh: Updated cache for section ${section.section_id}`
      );
    }

    // Main cache key update
    const mainCacheKey = `media:${type}:${section || "all"}:${count}`;

    // Process the full data like the main endpoint would
    // We won't fetch metadata as that's a separate cache and would slow this down
    const cacheEntry = {
      total: matchingSections.length,
      sections: matchingSections.map((s) => ({
        id: s.section_id,
        name: s.section_name || s.name,
      })),
      _timestamp: Date.now(),
    };

    // Update the main cache entry
    mediaCache.set(mainCacheKey, cacheEntry);
    logDebug(`Background refresh: Updated main cache for ${mainCacheKey}`);

    return true;
  } catch (error) {
    logError("Error in background cache refresh:", error);
    return false;
  } finally {
    // Remove from pending list
    pendingRefreshes.delete(refreshKey);
  }
};

// ======================================================================
// Dynamic Proxy Helper
// ======================================================================

const createDynamicProxy = (serviceName, options = {}) => {
  return (req, res, next) => {
    const config = getConfig();
    const target = serviceName === "Plex" ? config.plexUrl : config.tautulliUrl;

    if (!target) {
      return res.status(500).json({
        error: `${serviceName} URL not configured`,
        detail: `Please configure ${serviceName} URL in settings`,
      });
    }

    const proxy = createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: false,
      timeout: PROXY_TIMEOUT,
      proxyTimeout: PROXY_TIMEOUT,
      xfwd: true, // Forward the x-forwarded-* headers
      pathRewrite: (path) => {
        const newPath = path.replace(
          new RegExp(`^/api/${serviceName.toLowerCase()}`),
          ""
        );
        logDebug(`${serviceName} path rewrite:`, {
          from: path,
          to: newPath,
        });
        return newPath;
      },
      onProxyReq: (proxyReq, req, res) => {
        // Add service-specific headers
        if (serviceName === "Plex" && config.plexToken) {
          proxyReq.setHeader(
            "X-Plex-Client-Identifier",
            "PlexTautulliDashboard"
          );
          proxyReq.setHeader("X-Plex-Product", "Plex Tautulli Dashboard");
          proxyReq.setHeader("X-Plex-Version", "1.0.0");

          if (!req.query["X-Plex-Token"]) {
            proxyReq.setHeader("X-Plex-Token", config.plexToken);
          }
        }

        // Log the proxied request (with sensitive data redacted)
        logDebug(`${serviceName} proxy request:`, {
          path: proxyReq.path,
          headers: {
            ...proxyReq.getHeaders(),
            "x-plex-token": "[REDACTED]",
            authorization: "[REDACTED]",
          },
        });
      },
      onProxyRes: (proxyRes, req, res) => {
        // Handle CORS headers
        const origin = req.headers.origin || ALLOWED_ORIGINS[0];
        proxyRes.headers["Access-Control-Allow-Origin"] =
          ALLOWED_ORIGINS.includes("*") ? "*" : origin;
        proxyRes.headers["Access-Control-Allow-Credentials"] = "true";
        proxyRes.headers["Access-Control-Allow-Headers"] = [
          "Content-Type",
          "Authorization",
          ...PLEX_HEADERS,
        ].join(", ");

        // Log the response (without sensitive data)
        logDebug(`${serviceName} proxy response:`, {
          status: proxyRes.statusCode,
          url: req.url,
          headers: {
            ...proxyRes.headers,
            authorization: proxyRes.headers.authorization
              ? "[REDACTED]"
              : undefined,
          },
        });
      },
      onError: (err, req, res) => {
        logError(`${serviceName} proxy error:`, {
          message: err.message,
          code: err.code,
          stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });

        // Send a more detailed error response
        res.status(500).json({
          error: `${serviceName} Proxy Error`,
          message: err.message,
          code: err.code,
          detail: `Failed to proxy request to ${serviceName}. Please check your connection and settings.`,
        });
      },
      ...options,
    });

    return proxy(req, res, next);
  };
};

// Helper for configuration display
const formatConfig = (config) => {
  let output = "";
  Object.entries(config).forEach(([key, value]) => {
    // Capitalize the first letter of each key
    const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);

    // Redact sensitive values if key includes "token" or "apikey"
    const displayValue =
      key.toLowerCase().includes("token") ||
      key.toLowerCase().includes("apikey")
        ? value
          ? "REDACTED"
          : "Not set"
        : value || "Not set";
    output += `${capitalizedKey}: ${displayValue},\n`;
  });
  return output;
};

// ======================================================================
// Server Setup
// ======================================================================

const app = express();
const appVersion = getAppVersion();

// Initialize directories
ensureDirectories();

// Apply CORS middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle OPTIONS preflight explicitly

// Request logging middleware
app.use((req, res, next) => {
  logDebug(
    `${req.method} ${req.url} - Origin: ${req.headers.origin || "none"}`
  );
  next();
});

app.use(express.json());

// Detailed logging middleware
app.use((req, res, next) => {
  logDebug("Request:", {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    headers: {
      ...req.headers,
      "x-plex-token": req.headers["x-plex-token"] ? "[REDACTED]" : undefined,
      authorization: req.headers.authorization ? "[REDACTED]" : undefined,
    },
  });
  next();
});

// ======================================================================
// Logging API Routes
// ======================================================================

// Get current log level
app.get("/api/logs/level", (req, res) => {
  try {
    const level = getLogLevel();
    res.json({
      success: true,
      level: level,
    });
    logDebug(`Log level requested: ${level}`);
  } catch (error) {
    logError("Error getting log level", error);
    res.status(500).json({
      success: false,
      message: "Failed to get log level",
      error: error.message,
    });
  }
});

// Set log level
app.post("/api/logs/level", (req, res) => {
  try {
    const { level } = req.body;

    if (!level || typeof level !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing level parameter",
      });
    }

    const success = setLogLevel(level.toUpperCase());

    if (success) {
      logInfo(`Log level changed to ${level}`, { source: "api" });
      res.json({
        success: true,
        level: getLogLevel(),
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid log level",
        validLevels: getLogLevels(),
      });
    }
  } catch (error) {
    logError("Error setting log level", error);
    res.status(500).json({
      success: false,
      message: "Failed to set log level",
      error: error.message,
    });
  }
});

// Get server logs
app.get("/api/logs", (req, res) => {
  try {
    const logs = getLogs();
    logDebug(`Retrieved ${logs.length} logs`);
    res.json({
      success: true,
      logs: logs,
    });
  } catch (error) {
    logError("Error getting logs", error);
    res.status(500).json({
      success: false,
      message: "Failed to get logs",
      error: error.message,
    });
  }
});

// Clear server logs
app.post("/api/logs/clear", (req, res) => {
  try {
    clearLogs();
    logInfo("Logs cleared via API");
    res.json({ success: true });
  } catch (error) {
    logError("Error clearing logs", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear logs",
      error: error.message,
    });
  }
});

// Download logs as text file
app.get("/api/logs/download", (req, res) => {
  try {
    const logText = exportLogs();
    const filename = `plex-tautulli-dashboard-logs-${
      new Date().toISOString().split("T")[0]
    }.txt`;

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(logText);

    logInfo(`Logs downloaded (${logText.length} bytes)`);
  } catch (error) {
    logError("Error downloading logs", error);
    res.status(500).json({
      success: false,
      message: "Failed to download logs",
      error: error.message,
    });
  }
});

// ======================================================================
// API Routes
// ======================================================================

// Formats Management
app.get("/api/formats", (req, res) => {
  try {
    const formats = getFormats();
    // Ensure libraries array exists
    formats.libraries = formats.libraries || [];

    res.json({
      downloads: formats.downloads || [],
      recentlyAdded: formats.recentlyAdded || [],
      sections: formats.sections || [],
      libraries: formats.libraries,
      users: formats.users || [],
    });
  } catch (error) {
    logError("Error reading formats:", error);
    res.status(500).json({ error: "Failed to read formats" });
  }
});

app.post("/api/formats", (req, res) => {
  try {
    const { type, formats } = req.body;

    if (!type || !Array.isArray(formats)) {
      return res.status(400).json({ error: "Invalid format data" });
    }

    // Get current formats
    const allFormats = getFormats();

    // Make sure libraries array exists
    if (!allFormats.libraries) {
      allFormats.libraries = [];
    }

    if (type === "libraries") {
      // For libraries formats, store media type with each format
      allFormats.libraries = formats.map((format) => ({
        ...format,
        // Ensure mediaType exists (defaulting to "movies" if missing)
        mediaType: format.mediaType || "movies",
      }));
    } else if (type === "recentlyAdded") {
      // Completely replace the recentlyAdded formats with the new array
      allFormats.recentlyAdded = formats;
    } else {
      // For other types, replace the entire array
      allFormats[type] = formats;
    }

    // Save formats
    if (saveFormats(allFormats)) {
      res.json({
        success: true,
        formats: allFormats,
      });
    } else {
      throw new Error("Failed to save formats");
    }
  } catch (error) {
    logError("Error saving formats:", error);
    res.status(500).json({
      error: "Failed to save formats",
      message: error.message,
    });
  }
});

// Media API
app.get("/api/media/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const { count = 10, section } = req.query;
    const config = getConfig();

    if (!["movies", "shows"].includes(type)) {
      return res.status(400).json({ error: "Invalid media type" });
    }

    // Get formats
    const formats = getFormats().sections || [];

    // Get all sections
    const sectionsResponse = await axios.get(`${config.tautulliUrl}/api/v2`, {
      params: {
        apikey: config.tautulliApiKey,
        cmd: "get_libraries_table",
      },
    });

    const allSections = sectionsResponse.data?.response?.data?.data || [];
    const mediaType = type === "shows" ? "show" : "movie";
    let targetSections = allSections.filter(
      (s) => s.section_type === mediaType
    );

    // Filter by specific section if provided
    if (section) {
      targetSections = targetSections.filter(
        (s) => s.section_id.toString() === section
      );
      if (targetSections.length === 0) {
        return res.status(404).json({ error: "Section not found" });
      }
    }

    // Fetch recently added for each section
    const mediaPromises = targetSections.map(async (section) => {
      // Get library details including counts
      const libraryDetails = await getLibraryDetails(
        section.section_id,
        config
      );

      // Get recently added items
      const response = await axios.get(`${config.tautulliUrl}/api/v2`, {
        params: {
          apikey: config.tautulliApiKey,
          cmd: "get_recently_added",
          section_id: section.section_id,
          count: count,
          include_details: 1, // Request additional metadata
        },
      });

      const items = response.data?.response?.data?.recently_added || [];

      // Enhance each item with library details and section info
      return items.map((item) => ({
        ...item,
        ...libraryDetails,
        section_id: section.section_id,
        section_name: section.section_name,
        library_name: section.section_name, // Add library name
        // Ensure arrays are always arrays even if empty
        directors: item.directors || [],
        writers: item.writers || [],
        actors: item.actors || [],
        genres: item.genres || [],
        labels: item.labels || [],
        collections: item.collections || [],
      }));
    });

    let allMedia = await Promise.all(mediaPromises);
    allMedia = allMedia.flat();

    // Sort by date added (newest first)
    allMedia.sort((a, b) => b.added_at - a.added_at);

    // Limit to requested count
    allMedia = allMedia.slice(0, parseInt(count));

    // Apply custom formats
    const formattedMedia = allMedia.map((media) => {
      const applicableFormats = formats.filter(
        (format) =>
          format.sectionId === "all" ||
          format.sectionId === media.section_id.toString()
      );

      const formattedData = {};
      applicableFormats.forEach((format) => {
        formattedData[format.name] = processTemplate(format.template, media);
      });

      return {
        ...formattedData,
        media,
      };
    });

    res.json({
      total: formattedMedia.length,
      sections: targetSections.map((s) => ({
        id: s.section_id,
        name: s.section_name,
      })),
      media: formattedMedia,
    });
  } catch (error) {
    logError(`Error fetching ${req.params.type}:`, error);
    res.status(500).json({
      error: `Failed to fetch ${req.params.type}`,
      message: error.message,
    });
  }
});

// Users API
app.get("/api/users", async (req, res) => {
  try {
    // Generate unique request ID for logging
    const requestId =
      Date.now().toString(36) + Math.random().toString(36).substring(2);
    logInfo(`[${requestId}] Starting /api/users request`);

    const config = getConfig();
    const { count = 50 } = req.query; // Default to 100 if not specified
    const requestedCount = Math.max(1, parseInt(count, 10) || 50);
    const forceRefresh = req.query.refresh === "true"; // Optional force refresh parameter

    // No caching headers for browser
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Get stored formats
    const formatsData = getFormats();
    const userFormats = formatsData.users || [];

    logInfo(`[${requestId}] Fetching active sessions and users...`);

    // STEP 1: Fetch both active sessions and users in parallel
    let activeSessions = [];
    let allUsers = [];

    try {
      const [activeSessionsResponse, usersResponse] = await Promise.all([
        axios.get(`${config.tautulliUrl}/api/v2`, {
          params: {
            apikey: config.tautulliApiKey,
            cmd: "get_activity",
          },
          timeout: 10000,
        }),
        axios.get(`${config.tautulliUrl}/api/v2`, {
          params: {
            apikey: config.tautulliApiKey,
            cmd: "get_users_table",
            length: 1000,
          },
          timeout: 10000,
        }),
      ]);

      activeSessions =
        activeSessionsResponse.data?.response?.data?.sessions || [];
      allUsers = usersResponse.data?.response?.data?.data || [];

      logInfo(
        `[${requestId}] Successfully fetched ${activeSessions.length} active sessions and ${allUsers.length} users`
      );
    } catch (error) {
      logError(`[${requestId}] Error fetching initial data:`, error);
      throw new Error(`Failed to fetch initial user data: ${error.message}`);
    }

    // STEP 2: Create a lookup map for active sessions
    const watchingUsers = {};
    for (const session of activeSessions) {
      if (session.state === "playing") {
        watchingUsers[session.user_id] = {
          current_media: session.grandparent_title
            ? `${session.grandparent_title} - ${session.title}`
            : session.title,
          last_played_modified: formatShowTitle(session),
          media_type: session.media_type,
          progress_percent: session.progress_percent || "0",
          view_offset: Math.floor((session.view_offset || 0) / 1000),
          duration: Math.floor((session.duration || 0) / 1000), // Store in seconds for consistency
          media_duration: session.duration || 0, // Actual media duration in milliseconds
          last_seen: Math.floor(Date.now() / 1000),
          parent_media_index: session.parent_media_index,
          media_index: session.media_index,
          title: session.title || "",
          full_title: session.full_title || "",
          parent_title: session.parent_title || "",
          grandparent_title: session.grandparent_title || "",
          original_title: session.original_title || "",
          year: session.year || "",
          rating_key: session.rating_key,
        };
      }
    }

    // STEP 3: Filter out Local users and sort by last_seen (most recent first)
    const filteredUsers = allUsers
      .filter((user) => user.friendly_name !== "Local")
      .sort((a, b) => {
        // First check if user is watching (active users first)
        const aIsWatching = !!watchingUsers[a.user_id];
        const bIsWatching = !!watchingUsers[b.user_id];

        if (aIsWatching && !bIsWatching) return -1;
        if (!aIsWatching && bIsWatching) return 1;

        // If neither is watching or both are watching, sort by last_seen
        const aLastSeen = aIsWatching
          ? Date.now() / 1000
          : a.last_seen
          ? parseInt(a.last_seen, 10)
          : 0;
        const bLastSeen = bIsWatching
          ? Date.now() / 1000
          : b.last_seen
          ? parseInt(b.last_seen, 10)
          : 0;

        return bLastSeen - aLastSeen;
      });

    logInfo(
      `[${requestId}] Sorted ${filteredUsers.length} users by active status and last seen time`
    );

    // STEP 4: Limit users to those we'll actually return
    const limitedUsers = filteredUsers.slice(0, requestedCount);

    logInfo(
      `[${requestId}] Processing ${limitedUsers.length} users (top ${requestedCount} active users)`
    );

    // STEP 5: Process each limited user
    const processedUsers = await Promise.all(
      limitedUsers.map(async (user, index) => {
        const watching = watchingUsers[user.user_id];
        const lastSeen = watching
          ? watching.last_seen
          : parseInt(user.last_seen, 10);

        // If user is watching, clear their cache entry to ensure fresh data next time
        if (watching) {
          historyCache.delete(`user_history:${user.user_id}`);
        }

        // Create base user data object with default values
        return {
          friendly_name: user.friendly_name || "",
          user_id: user.user_id,
          email: user.email || "",
          plays: parseInt(user.plays || "0", 10),
          duration: watching?.media_duration || 0, // Initialize with media duration if watching
          formatted_duration: "", // Will be set after we have the actual media duration
          last_seen: lastSeen,
          last_seen_formatted: watching
            ? "🟢"
            : user.last_seen
            ? formatTimeDiff(user.last_seen)
            : "Never",
          is_active: !!watching,
          is_watching: watching ? "Watching" : "Watched",
          state: watching ? "watching" : "watched",

          // Existing properties
          media_type: watching
            ? watching.media_type.charAt(0).toUpperCase() +
              watching.media_type.slice(1)
            : "",
          progress_percent: watching ? `${watching.progress_percent}%` : "",
          progress_time: watching
            ? `${formatTimeHHMM(
                watching.view_offset * 1000
              )} / ${formatTimeHHMM(watching.duration * 1000)}`
            : "",
          title: watching ? watching.title : "",
          original_title: watching ? watching.original_title : "",
          year: watching ? watching.year : "",
          full_title: watching ? watching.full_title : "",
          last_played: watching
            ? watching.current_media
            : user.last_played || "Nothing",
          last_played_modified: watching
            ? watching.last_played_modified
            : user.last_played || "Nothing",
          parent_title: watching ? watching.parent_title : "",
          grandparent_title: watching ? watching.grandparent_title : "",
          media_index: watching
            ? String(watching.media_index).padStart(2, "0")
            : "",
          parent_media_index: watching
            ? String(watching.parent_media_index).padStart(2, "0")
            : "",

          // Track original index for updating
          _index: index,
          _cached: false,
        };
      })
    );

    // STEP 6: ONLY fetch history for users who aren't watching and are in our limited set
    const historyPromises = [];

    for (let i = 0; i < processedUsers.length; i++) {
      const userData = processedUsers[i];

      // Only fetch history if user isn't watching but has played something
      if (!userData.is_active && userData.last_played !== "Nothing") {
        const cacheKey = `user_history:${userData.user_id}`;

        // Check cache first
        const cachedHistory = forceRefresh ? null : historyCache.get(cacheKey);

        if (cachedHistory) {
          // Use cached history data
          logDebug(
            `[${requestId}] Using cached history for user ${userData.friendly_name} (${userData.user_id})`
          );

          // Update user data with cached history
          processedUsers[i].media_type = cachedHistory.media_type || "";
          processedUsers[i].title = cachedHistory.title || "";
          processedUsers[i].original_title = cachedHistory.original_title || "";
          processedUsers[i].year = cachedHistory.year || "";
          processedUsers[i].full_title = cachedHistory.full_title || "";
          processedUsers[i].parent_title = cachedHistory.parent_title || "";
          processedUsers[i].grandparent_title =
            cachedHistory.grandparent_title || "";
          processedUsers[i].media_index = cachedHistory.media_index || "";
          processedUsers[i].parent_media_index =
            cachedHistory.parent_media_index || "";
          processedUsers[i].last_played_modified =
            cachedHistory.last_played_modified || processedUsers[i].last_played;
          processedUsers[i].duration = cachedHistory.media_duration || 0; // Use cached media duration
          processedUsers[i].formatted_duration = formatDuration(
            processedUsers[i].duration
          ); // Format it
          processedUsers[i]._cached = true;
        } else {
          // Queue up history fetch with index attached
          logDebug(
            `[${requestId}] Queueing history fetch for user ${userData.friendly_name} (${userData.user_id})`
          );

          historyPromises.push({
            index: i,
            userId: userData.user_id,
            promise: getUserHistoryWithMetadata(
              config.tautulliUrl,
              config.tautulliApiKey,
              userData.user_id,
              requestId
            ),
          });
        }
      } else if (userData.is_active) {
        // If user is active, use the media duration from watching
        const watching = watchingUsers[userData.user_id];
        if (watching && watching.media_duration) {
          processedUsers[i].duration = watching.media_duration;
          processedUsers[i].formatted_duration = formatDuration(
            watching.media_duration
          );
        }
      }
    }

    // STEP 7: Fetch history and metadata for users with no cache hit
    if (historyPromises.length > 0) {
      logInfo(
        `[${requestId}] Fetching history for ${historyPromises.length} users (cache miss or forced refresh)...`
      );

      // Wait for all history promises to complete
      const historyResults = await Promise.allSettled(
        historyPromises.map((item) => item.promise)
      );

      // Apply history results to users
      historyPromises.forEach((item, i) => {
        const { index, userId } = item;
        const result = historyResults[i];

        if (result.status === "fulfilled" && result.value) {
          const historyItem = result.value;
          const cacheKey = `user_history:${userId}`;

          // Get the media duration from the history item
          const mediaDuration = historyItem.media_duration || 0;

          // Prepare the cache object
          const cacheObj = {
            media_type: historyItem.media_type
              ? historyItem.media_type.charAt(0).toUpperCase() +
                historyItem.media_type.slice(1)
              : "",
            title: historyItem.title || "",
            original_title: historyItem.original_title || "",
            year: historyItem.year || "",
            full_title: historyItem.full_title || "",
            parent_title: historyItem.parent_title || "",
            grandparent_title: historyItem.grandparent_title || "",
            media_index: historyItem.media_index
              ? String(historyItem.media_index).padStart(2, "0")
              : "",
            parent_media_index: historyItem.parent_media_index
              ? String(historyItem.parent_media_index).padStart(2, "0")
              : "",
            last_played_modified: formatShowTitle(historyItem),
            media_duration: mediaDuration, // Store actual media duration
            timestamp: Date.now(),
          };

          // Update user data with history and media duration
          processedUsers[index].media_type = cacheObj.media_type;
          processedUsers[index].title = cacheObj.title;
          processedUsers[index].original_title = cacheObj.original_title;
          processedUsers[index].year = cacheObj.year;
          processedUsers[index].full_title = cacheObj.full_title;
          processedUsers[index].parent_title = cacheObj.parent_title;
          processedUsers[index].grandparent_title = cacheObj.grandparent_title;
          processedUsers[index].media_index = cacheObj.media_index;
          processedUsers[index].parent_media_index =
            cacheObj.parent_media_index;
          processedUsers[index].last_played_modified =
            cacheObj.last_played_modified;
          processedUsers[index].duration = mediaDuration; // Use actual media duration
          processedUsers[index].formatted_duration =
            formatDuration(mediaDuration); // Format it

          // Store in cache
          historyCache.set(cacheKey, cacheObj);

          logDebug(
            `[${requestId}] Updated and cached history for user ${processedUsers[index].friendly_name}: ${processedUsers[index].media_type} - ${processedUsers[index].title} - Duration: ${processedUsers[index].formatted_duration}`
          );
        } else {
          // If history fetch failed, set a default formatted duration
          processedUsers[index].formatted_duration = "Unknown";

          // Log the error
          logWarn(
            `[${requestId}] Failed to fetch history for user ${
              processedUsers[index].friendly_name
            }: ${
              result.status === "rejected" ? result.reason : "No history found"
            }`
          );
        }
      });
    }

    // Final formatting of any users that might not have a formatted_duration yet
    processedUsers.forEach((user, i) => {
      if (!user.formatted_duration && user.duration) {
        processedUsers[i].formatted_duration = formatDuration(user.duration);
      } else if (!user.formatted_duration) {
        processedUsers[i].formatted_duration = "0m";
      }
    });

    const formattedUsers = processedUsers.map((userData) => {
      const rawData = userData.raw_data || userData;

      // Determine media type for format matching
      const mediaTypeMap = {
        movie: "movie",
        episode: "episode",
      };
      const mediaType = (rawData.media_type || "").toLowerCase();
      const mappedMediaType = mediaTypeMap[mediaType] || mediaType;

      // Filter formats based on media type
      const applicableFormats = userFormats.filter(
        (format) =>
          !format.mediaType || // No media type specified (applies to all)
          format.mediaType === mappedMediaType
      );

      // Apply each applicable format
      const formattedOutput = {};
      applicableFormats.forEach((format) => {
        try {
          const result = processTemplate(format.template, userData);
          formattedOutput[format.name] = result;
        } catch (err) {
          logError(
            `[${requestId}] Error applying format to user ${rawData.friendly_name}:`,
            err
          );
          formattedOutput[format.name] = "";
        }
      });

      // Remove internal tracking properties
      const { _index, _cached, ...cleanData } = rawData;

      return {
        ...formattedOutput,
        raw_data: cleanData,
      };
    });

    // STEP 9: Send response
    logInfo(
      `[${requestId}] Sending response with ${formattedUsers.length} users`
    );

    res.json({
      success: true,
      total: filteredUsers.length,
      requestedCount: requestedCount,
      users: formattedUsers,
      cache: {
        hits: processedUsers.filter((u) => u._cached).length,
        misses: historyPromises.length,
        total: historyCache.stats().size,
      },
    });

    logInfo(`[${requestId}] Request completed successfully`);
  } catch (error) {
    logError("Error processing users:", error);
    res.status(500).json({
      error: "Failed to process users",
      message: error.message,
    });
  }
});

// Cache control
// Add a route to clear all caches
app.post("/api/clear-cache", (req, res) => {
  try {
    const previousSizes = {
      history: historyCache.stats().size,
      media: mediaCache.stats().size,
      metadata: metadataCache.stats().size,
    };

    const totalSize =
      previousSizes.history + previousSizes.media + previousSizes.metadata;

    // Clear all caches
    historyCache.clear();
    mediaCache.clear();
    metadataCache.clear();

    res.json({
      success: true,
      message: `Successfully cleared all caches with ${totalSize} total entries`,
      details: previousSizes,
    });
  } catch (error) {
    logError("Failed to clear cache", error);
    res.status(500).json({
      error: "Failed to clear cache",
      message: error.message,
    });
  }
});

// Maintain backward compatibility with the old endpoint
app.post("/api/users/clear-cache", (req, res) => {
  try {
    const previousSize = historyCache.stats().size;
    historyCache.clear();

    res.json({
      success: true,
      message: `Successfully cleared user history cache with ${previousSize} entries`,
    });
  } catch (error) {
    logError("Failed to clear cache", error);
    res.status(500).json({
      error: "Failed to clear cache",
      message: error.message,
    });
  }
});

// Add a selective cache clear endpoint
app.post("/api/clear-cache/:type", (req, res) => {
  try {
    const { type } = req.params;
    let message = "";
    let details = {};

    if (type === "media") {
      const size = mediaCache.stats().size;
      mediaCache.clear();
      message = `Successfully cleared media cache with ${size} entries`;
      details = { media: size };
    } else if (type === "metadata") {
      const size = metadataCache.stats().size;
      metadataCache.clear();
      message = `Successfully cleared metadata cache with ${size} entries`;
      details = { metadata: size };
    } else if (type === "history") {
      const size = historyCache.stats().size;
      historyCache.clear();
      message = `Successfully cleared history cache with ${size} entries`;
      details = { history: size };
    } else {
      return res.status(400).json({
        error: "Invalid cache type",
        message: "Cache type must be one of: media, metadata, history",
      });
    }

    res.json({
      success: true,
      message,
      details,
    });
  } catch (error) {
    logError("Failed to clear cache", error);
    res.status(500).json({
      error: "Failed to clear cache",
      message: error.message,
    });
  }
});

// Add a route to clear image cache headers
app.get("/api/clear-image-cache", (req, res) => {
  try {
    // Set cache control headers to prevent browser caching
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Generate a timestamp to use as a global cache breaker
    const timestamp = Date.now();

    logInfo(`Image cache clearing requested. New timestamp: ${timestamp}`);

    res.json({
      success: true,
      message: "Image cache headers cleared",
      timestamp: timestamp,
    });
  } catch (error) {
    logError("Failed to clear image cache", error);
    res.status(500).json({
      error: "Failed to clear image cache",
      message: error.message,
    });
  }
});

// Refresh posters endpoint - used to clear specific cached images
app.post("/api/refresh-posters", async (req, res) => {
  try {
    const { sectionId, mediaId } = req.body;

    // Generate a unique timestamp for cache busting
    const timestamp = Date.now();
    const requestId = `refresh-${timestamp}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    logInfo(
      `[${requestId}] Poster refresh requested: ${
        mediaId
          ? `Media ID ${mediaId}`
          : sectionId
          ? `Section ID ${sectionId}`
          : "All posters"
      }`
    );

    if (mediaId) {
      // Invalidate specific media item's metadata cache
      const cacheKey = `metadata:${mediaId}`;
      const hadCachedData = metadataCache.get(cacheKey) !== null;

      if (hadCachedData) {
        metadataCache.delete(cacheKey);
        logInfo(
          `[${requestId}] Cleared metadata cache for media ID ${mediaId}`
        );
      } else {
        logInfo(
          `[${requestId}] No cached metadata found for media ID ${mediaId}`
        );
      }

      // Also try to clear any section cache that might contain this media
      // This is more aggressive but ensures the changes get picked up
      try {
        const config = getConfig();

        // Get the full metadata to find the section ID
        const response = await axios.get(`${config.tautulliUrl}/api/v2`, {
          params: {
            apikey: config.tautulliApiKey,
            cmd: "get_metadata",
            rating_key: mediaId,
          },
          timeout: 5000,
        });

        // If we got a section ID, clear that section's cache
        const sectionId = response.data?.response?.data?.section_id;
        if (sectionId) {
          const sectionCacheKey = `section:${sectionId}:media`;
          mediaCache.delete(sectionCacheKey);
          logInfo(
            `[${requestId}] Cleared section cache for section ID ${sectionId} containing media ID ${mediaId}`
          );
        }
      } catch (metadataError) {
        // Non-fatal error - we'll still return success since we cleared the metadata cache
        logError(
          `[${requestId}] Error getting section ID for media ${mediaId}:`,
          metadataError
        );
      }
    } else if (sectionId) {
      // Invalidate all media in a section
      const sectionCacheKey = `section:${sectionId}:media`;
      const hadCachedData = mediaCache.get(sectionCacheKey) !== null;

      if (hadCachedData) {
        mediaCache.delete(sectionCacheKey);
        logInfo(`[${requestId}] Cleared cache for section ID ${sectionId}`);
      } else {
        logInfo(
          `[${requestId}] No cached data found for section ID ${sectionId}`
        );
      }

      // Also look for any type-specific cache keys
      const typeKeys = ["movies", "shows", "music"];
      typeKeys.forEach((type) => {
        const typeCacheKey = `media:${type}:${sectionId}:${
          requestedCount || 50
        }`;
        if (mediaCache.get(typeCacheKey)) {
          mediaCache.delete(typeCacheKey);
          logInfo(
            `[${requestId}] Cleared type cache for ${type} section ${sectionId}`
          );
        }
      });
    } else {
      // Clear browser image cache by sending a response event that the frontend can handle
      logInfo(`[${requestId}] Sending global image cache clear event`);
    }

    // Return success with timestamp for cache busting
    res.json({
      success: true,
      message: mediaId
        ? `Poster cache cleared for media ID ${mediaId}`
        : sectionId
        ? `Poster cache cleared for section ID ${sectionId}`
        : "All poster caches cleared",
      timestamp,
    });

    // Dispatch event for global updates if needed
    if (!mediaId && !sectionId) {
      // Trigger the imageCacheCleared event
      try {
        const eventPayload = {
          timestamp,
          requestId,
        };

        // This will only work if we have a real event emitter set up
        // If not, just log it
        logInfo(
          `[${requestId}] Would dispatch imageCacheCleared event: ${JSON.stringify(
            eventPayload
          )}`
        );
      } catch (eventError) {
        logError(`[${requestId}] Error dispatching event:`, eventError);
      }
    }
  } catch (error) {
    logError("Failed to refresh posters", error);
    res.status(500).json({
      error: "Failed to refresh posters",
      message: error.message,
    });
  }
});

// Downloads endpoint
app.get("/api/downloads", async (req, res) => {
  try {
    const config = getConfig();

    // Fetch activities from Plex
    const plexResponse = await axios.get(`${config.plexUrl}/activities`, {
      headers: {
        Accept: "application/json",
        "X-Plex-Token": config.plexToken,
      },
    });

    // Get stored formats
    const { downloads: formats } = getFormats();

    // Process the data with formats
    const processedData = {
      total: plexResponse.data?.MediaContainer?.Activity?.length || 0,
      activities:
        plexResponse.data?.MediaContainer?.Activity?.map((activity) => {
          const baseData = {
            uuid: activity.uuid,
            title: activity.title,
            subtitle: activity.subtitle,
            progress: activity.progress,
            type: activity.type,
          };

          // Create formatted data for this activity
          const formattedData = {};
          formats.forEach((format) => {
            formattedData[format.name] = processTemplate(
              format.template,
              baseData
            );
          });

          // Return with formats at top level and raw data in raw_data object
          return {
            ...formattedData, // Put custom formats at top level
            raw_data: baseData, // Put original data in raw_data
          };
        }) || [],
    };

    res.json(processedData);
  } catch (error) {
    logError("Error processing downloads:", error);
    res.status(500).json({
      error: "Failed to process downloads",
      message: error.message,
      details: error.response?.data || error.stack,
    });
  }
});

// Libraries endpoint
app.get("/api/libraries", async (req, res) => {
  try {
    const config = getConfig();
    const { mediaType } = req.query; // Allow filtering by media type

    const response = await axios.get(`${config.tautulliUrl}/api/v2`, {
      params: {
        apikey: config.tautulliApiKey,
        cmd: "get_libraries_table",
      },
    });

    if (response.data?.response?.result !== "success") {
      throw new Error("Failed to fetch libraries data");
    }

    // Get formats
    const formats = getFormats().libraries || [];

    // Process libraries with formatting
    const libraries = response.data.response.data.data.map((library) => {
      // Base data object for template processing
      const baseData = {
        section_id: library.section_id,
        section_name: library.section_name || library.name,
        section_type: library.section_type || library.type,
        count: library.count || 0,
        parent_count: library.parent_count || 0,
        child_count: library.child_count || 0,
        total_plays: library.plays || 0,
        last_accessed: library.last_accessed || "Never",
        last_played: library.last_played || "Never",
      };

      // Map section_type to media type for format filtering
      const sectionMediaType = (() => {
        const type = (library.section_type || library.type || "").toLowerCase();
        if (type === "movie") return "movies";
        if (type === "show") return "shows";
        if (type === "artist") return "music";
        return null;
      })();

      // Find applicable formats for this library based on section ID AND media type
      const applicableFormats = formats.filter((format) => {
        const sectionMatches =
          format.sectionId === "all" ||
          format.sectionId === library.section_id.toString();

        const mediaTypeMatches =
          !format.mediaType || format.mediaType === sectionMediaType;

        return sectionMatches && mediaTypeMatches;
      });

      // Apply each format to create formatted data
      const formattedData = {};
      applicableFormats.forEach((format) => {
        formattedData[format.name] = processTemplate(format.template, baseData);
      });

      // Return with formats at top level and raw data in raw_data object
      return {
        ...formattedData, // Custom formats at top level
        raw_data: {
          ...library,
          media_type: sectionMediaType, // Add mapped media type
        },
      };
    });

    // Filter by media type if requested
    const filteredLibraries = mediaType
      ? libraries.filter((lib) => {
          const type = (
            lib.raw_data.section_type ||
            lib.raw_data.type ||
            ""
          ).toLowerCase();
          if (mediaType === "movies" && type === "movie") return true;
          if (mediaType === "shows" && type === "show") return true;
          if (mediaType === "music" && type === "artist") return true;
          return false;
        })
      : libraries;

    res.json({
      total: filteredLibraries.length,
      libraries: filteredLibraries,
    });
  } catch (error) {
    logError("Error fetching libraries:", error);
    res.status(500).json({
      error: "Failed to fetch libraries",
      message: error.message,
      details: error.response?.data || error.stack,
    });
  }
});

// Sections API
app.get("/api/sections", async (req, res) => {
  try {
    // Read saved sections
    if (!fs.existsSync(SAVED_SECTIONS_PATH)) {
      fs.writeFileSync(SAVED_SECTIONS_PATH, JSON.stringify([], null, 2));
    }

    const rawData = fs.readFileSync(SAVED_SECTIONS_PATH, "utf8");
    const savedSections = JSON.parse(rawData);

    // Get formats
    const formats = getFormats().sections || [];

    // Apply formats to sections
    const formattedSections = savedSections.map((section) => {
      // Create a processed section with null values converted to "Never"
      const processedSection = {
        ...section,
        last_accessed: section.last_accessed || "Never",
        last_played: section.last_played || "Never",
        // Ensure type is always available
        type: section.type || section.section_type || "unknown",
      };

      // Create a base data object with all section fields
      const baseData = {
        section_id: section.section_id,
        section_name: section.name,
        section_type: section.type || section.section_type || "unknown",
        count: section.count || 0,
        parent_count: section.parent_count || 0,
        child_count: section.child_count || 0,
        last_accessed: section.last_accessed || "Never",
        last_updated: section.last_updated || "Never",
        last_played: section.last_played || "Never",
      };

      // Find applicable formats for this section
      const applicableFormats = formats.filter(
        (format) =>
          format.sectionId === "all" ||
          format.sectionId === section.section_id.toString()
      );

      // Apply each format to create formatted data
      const formattedData = {};
      applicableFormats.forEach((format) => {
        formattedData[format.name] = processTemplate(format.template, baseData);
      });

      // Return with formats at top level and raw data in raw_data object
      return {
        ...formattedData,
        raw_data: processedSection, // Processed section data with nulls as "Never"
      };
    });

    res.json({
      total: formattedSections.length,
      sections: formattedSections,
    });
  } catch (error) {
    logError("Error reading saved sections:", error);
    res.status(500).json({
      error: "Failed to read saved sections",
      message: error.message,
    });
  }
});

// Save sections
app.post("/api/sections", async (req, res) => {
  try {
    const sections = req.body;
    const config = getConfig();

    // Validate input
    if (!Array.isArray(sections)) {
      return res.status(400).json({
        error: "Invalid sections data",
        message: "Expected an array of sections",
      });
    }

    // Validate section structure
    const isValidSections = sections.every(
      (section) => section.section_id && section.type && section.name
    );

    if (!isValidSections) {
      return res.status(400).json({
        error: "Invalid section structure",
        message: "Each section must have section_id, type, and name",
      });
    }

    // Fetch library details for each section
    const sectionsWithDetails = await Promise.all(
      sections.map(async (section) => {
        try {
          logDebug(`Fetching details for section ${section.section_id}`);

          // Get library details from libraries table
          const libraryResponse = await axios.get(
            `${config.tautulliUrl}/api/v2`,
            {
              params: {
                apikey: config.tautulliApiKey,
                cmd: "get_libraries_table",
              },
            }
          );

          if (libraryResponse.data?.response?.result !== "success") {
            logError("Library response error:", libraryResponse.data);
            throw new Error("Failed to fetch library details");
          }

          const libraryData = libraryResponse.data?.response?.data?.data || [];
          const libraryDetails =
            libraryData.find((lib) => lib.section_id === section.section_id) ||
            {};

          logDebug(
            "Library details found:",
            JSON.stringify(libraryDetails, null, 2)
          );

          return {
            ...section,
            count: libraryDetails.count || 0,
            parent_count: libraryDetails.parent_count || 0,
            child_count: libraryDetails.child_count || 0,
            total_plays: libraryDetails.plays || 0,
            last_accessed: libraryDetails.last_accessed || null,
            last_played: libraryDetails.last_played || null,
            section_type: libraryDetails.section_type || section.type,
            section_name: libraryDetails.section_name || section.name,
          };
        } catch (error) {
          logError(
            `Error fetching details for section ${section.section_id}:`,
            error
          );
          return section;
        }
      })
    );

    // Write enhanced sections to file
    fs.writeFileSync(
      SAVED_SECTIONS_PATH,
      JSON.stringify(sectionsWithDetails, null, 2)
    );

    res.json({
      success: true,
      total: sectionsWithDetails.length,
      sections: sectionsWithDetails,
      message: `Successfully saved ${sectionsWithDetails.length} sections`,
    });
  } catch (error) {
    logError("Error saving sections:", error);
    res.status(500).json({
      error: "Failed to save sections",
      message: error.message,
    });
  }
});

// ======================================================================
// Recently Added API Endpoint with Improved Caching
// ======================================================================

// Recently Added endpoint
app.get("/api/recent/:type", async (req, res) => {
  try {
    const config = getConfig();
    const { type } = req.params;
    const { section, count = 50, refresh = "false" } = req.query; // Add refresh parameter
    const requestedCount = parseInt(count, 10);
    const forceRefresh = refresh === "true";

    // Generate request ID for logging and cache key
    const requestId =
      Date.now().toString(36) + Math.random().toString(36).substring(2);
    logDebug(`[${requestId}] Processing /api/recent/${type} request`);

    // Validate type
    const validTypes = {
      movies: "movie",
      shows: "show",
      music: "artist",
    };

    if (!validTypes[type]) {
      return res.status(400).json({ error: "Invalid media type" });
    }

    // Create cache key based on request parameters
    const cacheKey = `media:${type}:${section || "all"}:${requestedCount}`;

    // Get from cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedMedia = mediaCache.get(cacheKey);
      if (cachedMedia) {
        logDebug(`[${requestId}] Cache hit for ${cacheKey}`);

        // Add cache metadata to response
        const response = {
          ...cachedMedia,
          _cache: {
            hit: true,
            age: Math.floor((Date.now() - cachedMedia._timestamp) / 1000) + "s",
            key: cacheKey,
          },
        };

        // Even though we're returning cached data, refresh the cache in the background
        // for the next request. This keeps the cache fresh without blocking the user.
        setTimeout(() => {
          try {
            logDebug(
              `[${requestId}] Refreshing cache in background for ${cacheKey}`
            );
            refreshCacheInBackground(type, section, requestedCount);
          } catch (e) {
            logError(`[${requestId}] Error refreshing cache in background:`, e);
          }
        }, 100);

        return res.json(response);
      }
      logDebug(`[${requestId}] Cache miss for ${cacheKey}`);
    } else {
      logDebug(`[${requestId}] Forced refresh, bypassing cache`);
    }

    // Get formats
    const formatsData = getFormats();
    const recentlyAddedFormats = formatsData.recentlyAdded || [];

    // Fetch sections first
    let allSections;
    try {
      const sectionsResponse = await axios.get(`${config.tautulliUrl}/api/v2`, {
        params: {
          apikey: config.tautulliApiKey,
          cmd: "get_libraries_table",
        },
      });

      allSections = sectionsResponse.data?.response?.data?.data || [];
    } catch (sectionsError) {
      logError("Error fetching sections:", sectionsError);
      return res.status(500).json({
        error: "Failed to fetch library sections",
        message: sectionsError.message,
      });
    }

    // Filter sections by type and optional section ID
    const matchingSections = allSections.filter((s) => {
      // Safely get section type, handling different property names
      const sectionType = (s.section_type || s.type || "")
        .toString()
        .toLowerCase();
      const matchesType = sectionType === validTypes[type];

      // If specific section is requested, check section ID
      if (section) {
        return matchesType && s.section_id.toString() === section.toString();
      }

      return matchesType;
    });

    // If no matching sections, return empty result
    if (matchingSections.length === 0) {
      return res.json({
        total: 0,
        media: [],
        sections: [],
        error: section
          ? `No sections found for type ${type} with section ID ${section}`
          : "No sections found for this media type",
      });
    }

    // Fetch media for matching sections
    const sectionMediaPromises = matchingSections.map(async (section) => {
      try {
        // Generate section cache key
        const sectionCacheKey = `section:${section.section_id}:media`;
        let sectionMedia;

        // Try to get section media from cache unless forced refresh
        if (!forceRefresh) {
          sectionMedia = mediaCache.get(sectionCacheKey);
          if (sectionMedia) {
            logDebug(
              `[${requestId}] Using cached media for section ${section.section_id}`
            );
            return sectionMedia;
          }
        }

        // If not in cache, fetch from API
        logDebug(
          `[${requestId}] Fetching media for section ${section.section_id}`
        );
        const response = await axios.get(`${config.tautulliUrl}/api/v2`, {
          params: {
            apikey: config.tautulliApiKey,
            cmd: "get_recently_added",
            section_id: section.section_id,
            count: 50, // Fetch enough items to ensure we have at least the requested count
          },
        });

        // Process and cache the section media data
        sectionMedia = (
          response.data?.response?.data?.recently_added || []
        ).map((item) => ({
          ...item,
          section_id: section.section_id,
          section_name: section.section_name || section.name,
        }));

        // Cache the section media for future requests
        mediaCache.set(sectionCacheKey, sectionMedia);

        return sectionMedia;
      } catch (error) {
        logError(
          `Error fetching recently added for section ${section.section_id}:`,
          error
        );
        return [];
      }
    });

    // Wait for all section media fetches
    let allMedia = await Promise.all(sectionMediaPromises);
    allMedia = allMedia.flat();

    // If no media found
    if (allMedia.length === 0) {
      return res.json({
        total: 0,
        media: [],
        sections: matchingSections.map((s) => ({
          id: s.section_id,
          name: s.section_name || s.name,
        })),
        error: "No recently added media found",
      });
    }

    // Sort by added date (newest first)
    allMedia.sort(
      (a, b) => parseInt(b.added_at || 0) - parseInt(a.added_at || 0)
    );

    // Limit results to the requested count
    const limitedMedia = allMedia.slice(0, requestedCount);

    const processedMedia = await Promise.all(
      limitedMedia.map(async (media) => {
        // Try to get metadata from cache
        const metadataCacheKey = `metadata:${media.rating_key}`;
        let videoResolution = "Unknown";
        let cachedMetadata = false;

        // Check metadata cache
        if (!forceRefresh && media.rating_key) {
          const metadata = metadataCache.get(metadataCacheKey);
          if (metadata) {
            videoResolution = metadata.video_full_resolution || "Unknown";
            cachedMetadata = true;
            logDebug(
              `[${requestId}] Using cached metadata for ${media.rating_key}`
            );

            // Apply cached metadata to the media item
            media.video_full_resolution = videoResolution;
            media.content_rating = metadata.content_rating || null;
            media.rating = metadata.rating || null;
            media.summary = metadata.summary || media.summary;

            // If complete metadata is available, apply additional fields
            if (metadata.complete_metadata) {
              const completeData = metadata.complete_metadata;
              // Apply other important fields that might be needed for display
              media.genres = completeData.genres || [];
              media.directors = completeData.directors || [];
              media.actors = completeData.actors || [];
            }
          }
        }

        // Fetch metadata if not cached
        if (!cachedMetadata && media.rating_key) {
          try {
            logDebug(
              `[${requestId}] Fetching metadata for ${media.rating_key}`
            );
            const metadataResponse = await axios.get(
              `${config.tautulliUrl}/api/v2`,
              {
                params: {
                  apikey: config.tautulliApiKey,
                  cmd: "get_metadata",
                  rating_key: media.rating_key,
                },
                timeout: 5000,
              }
            );

            const responseData = metadataResponse.data?.response?.data;

            if (responseData) {
              // Extract all metadata rather than just resolution
              const mediaInfo = responseData.media_info?.[0] || {};
              videoResolution = mediaInfo.video_full_resolution || "Unknown";

              // Cache the complete metadata
              metadataCache.set(metadataCacheKey, {
                // Include important metadata fields explicitly
                video_full_resolution: videoResolution,
                content_rating: responseData.content_rating || null,
                rating: responseData.rating || null,
                summary: responseData.summary || null,
                duration: responseData.duration || null,
                // Store the complete metadata for future use
                complete_metadata: responseData,
                media_info: mediaInfo,
                timestamp: Date.now(),
              });

              // Update the current media item with critical metadata
              media.video_full_resolution = videoResolution;
              media.content_rating = responseData.content_rating || null;
              media.rating = responseData.rating || null;
            }
          } catch (error) {
            logError(
              `Failed to fetch metadata for ${media.rating_key}:`,
              error
            );
          }
        }

        // Calculate formatted duration once
        const formattedDuration = formatDuration(media.duration || 0);

        // Enhanced media object with both aliases and formatted data
        const enhancedMedia = {
          ...media,
          mediaType: type,
          media_type: type,
          formatted_duration: formattedDuration,
          video_full_resolution: videoResolution,
          // Ensure content rating is included
          content_rating: media.content_rating || null,
          // Add both key variations for timestamps
          addedAt: media.added_at,
          added_at: media.added_at,
        };

        const formattedData = {};

        // Apply formats based on media type
        recentlyAddedFormats
          .filter(
            (format) =>
              format.type === type &&
              (format.sectionId === "all" ||
                format.sectionId === media.section_id.toString())
          )
          .forEach((format) => {
            // Process special variables before template processing
            let processedTemplate = format.template;

            // Handle added_at:format pattern specifically
            const dateFormatPattern = /\{added_at:([^}]+)\}/g;
            processedTemplate = processedTemplate.replace(
              dateFormatPattern,
              (match, formatType) => {
                return formatDate(media.added_at, formatType);
              }
            );

            // Same for addedAt:format
            const dateFormatPattern2 = /\{addedAt:([^}]+)\}/g;
            processedTemplate = processedTemplate.replace(
              dateFormatPattern2,
              (match, formatType) => {
                return formatDate(media.added_at, formatType);
              }
            );

            // Special handling for duration
            processedTemplate = processedTemplate.replace(
              /\{duration\}/g,
              formattedDuration
            );

            // Now process the template with the enhanced media data
            formattedData[format.name] = enhancedProcessTemplate(
              processedTemplate,
              enhancedMedia
            );
          });

        return {
          ...formattedData,
          raw_data: {
            ...media,
            formatted_duration: formattedDuration,
            video_full_resolution: videoResolution,
            _cached_metadata: cachedMetadata,
          },
        };
      })
    );

    // Prepare the full response
    const responseData = {
      total: processedMedia.length,
      media: processedMedia,
      sections: matchingSections.map((s) => ({
        id: s.section_id,
        name: s.section_name || s.name,
      })),
      appliedFormats: recentlyAddedFormats
        .filter((f) => f.type === type)
        .map((f) => ({
          name: f.name,
          sectionId: f.sectionId,
        })),
      _timestamp: Date.now(),
    };

    // Cache the entire response
    mediaCache.set(cacheKey, responseData);
    logDebug(`[${requestId}] Cached response with key ${cacheKey}`);

    // Send response
    res.json({
      ...responseData,
      _cache: {
        hit: false,
        fresh: true,
        key: cacheKey,
      },
    });
  } catch (error) {
    logError("Error processing recently added media:", error);
    res.status(500).json({
      error: "Failed to process recently added media",
      message: error.message,
      details: error.response?.data || error.stack,
    });
  }
});

// Configuration Management
app.post("/api/config", (req, res) => {
  const { plexUrl, plexToken, tautulliUrl, tautulliApiKey } = req.body;

  logInfo("Received config update:", {
    plexUrl,
    plexToken: plexToken ? "[REDACTED]" : undefined,
    tautulliUrl,
    tautulliApiKey: tautulliApiKey ? "[REDACTED]" : undefined,
  });

  const currentConfig = getConfig();

  const updatedConfig = {
    plexUrl: plexUrl || currentConfig.plexUrl,
    plexToken: plexToken || currentConfig.plexToken,
    tautulliUrl: tautulliUrl || currentConfig.tautulliUrl,
    tautulliApiKey: tautulliApiKey || currentConfig.tautulliApiKey,
  };

  setConfig(updatedConfig);

  res.json({
    status: "ok",
    config: {
      plexUrl: updatedConfig.plexUrl,
      tautulliUrl: updatedConfig.tautulliUrl,
      hasPlexToken: !!updatedConfig.plexToken,
      hasTautulliKey: !!updatedConfig.tautulliApiKey,
    },
  });
});

app.get("/api/config", (req, res) => {
  const config = getConfig();
  res.json({
    plexUrl: config.plexUrl,
    tautulliUrl: config.tautulliUrl,
    plexToken: config.plexToken,
    tautulliApiKey: config.tautulliApiKey,
  });
});

app.post("/api/reset-all", (req, res) => {
  try {
    const configPath = path.join(process.cwd(), "configs", "config.json");
    const formatsPath = path.join(process.cwd(), "configs", "formats.json");
    const savedSectionsPath = path.join(
      process.cwd(),
      "configs",
      "sections.json"
    );

    // Reset config.json
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          plexUrl: null,
          plexToken: null,
          tautulliUrl: null,
          tautulliApiKey: null,
        },
        null,
        2
      )
    );

    // Reset formats.json
    fs.writeFileSync(
      formatsPath,
      JSON.stringify(
        {
          downloads: [],
          recentlyAdded: [],
          sections: [],
          users: [],
        },
        null,
        2
      )
    );

    // Reset sections.json to an empty array
    fs.writeFileSync(savedSectionsPath, JSON.stringify([], null, 2));

    // Log the reset action
    logInfo("All configurations have been reset:", {
      configPath,
      formatsPath,
      savedSectionsPath,
    });

    res.json({
      status: "success",
      message: "All configurations reset successfully",
    });
  } catch (error) {
    logError("Failed to reset configurations:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to reset configurations",
      details: error.message,
    });
  }
});

// Health & Status APIs
app.get("/api/health", async (req, res) => {
  try {
    const config = getConfig();

    // Base response structure
    const healthData = {
      status: "ok",
      timestamp: new Date().toISOString(),
      config: {
        plexUrl: config.plexUrl || "Not configured",
        tautulliUrl: config.tautulliUrl || "Not configured",
        hasPlexToken: !!config.plexToken,
        hasTautulliKey: !!config.tautulliApiKey,
      },
    };

    // Add service checks if requested
    if (req.query.check === "true") {
      healthData.services = {
        plex: {
          configured: !!(config.plexUrl && config.plexToken),
          online: false,
        },
        tautulli: {
          configured: !!(config.tautulliUrl && config.tautulliApiKey),
          online: false,
        },
      };

      // Check Plex if configured
      if (healthData.services.plex.configured) {
        try {
          const response = await axios.get(`${config.plexUrl}/identity`, {
            headers: {
              "X-Plex-Token": config.plexToken,
              Accept: "application/json",
            },
            timeout: 5000,
          });

          healthData.services.plex.online = response.status === 200;
          healthData.services.plex.serverName =
            response.data?.MediaContainer?.friendlyName || null;
        } catch (error) {
          logError("Plex health check failed:", error.message);
          healthData.services.plex.error = error.message;
        }
      }

      // Check Tautulli if configured
      if (healthData.services.tautulli.configured) {
        try {
          // Using 'status' instead of 'get_server_info'
          const response = await axios.get(`${config.tautulliUrl}/api/v2`, {
            params: {
              apikey: config.tautulliApiKey,
              cmd: "status",
            },
            timeout: 5000,
          });

          // Check if response indicates success
          healthData.services.tautulli.online =
            response.data?.response?.result === "success";

          // Add additional information if available
          if (response.data?.response?.data) {
            healthData.services.tautulli.version =
              response.data.response.data.version || null;
            healthData.services.tautulli.data = response.data.response.data;
          }
        } catch (error) {
          logError("Tautulli health check failed:", error.message);
          healthData.services.tautulli.error = error.message;
        }
      }
    }

    // Set appropriate headers
    res.setHeader("Content-Type", "application/json");
    return res.json(healthData);
  } catch (error) {
    logError("Health API error:", error);
    return res.status(500).json({
      status: "error",
      error: "Server error during health check",
      timestamp: new Date().toISOString(),
    });
  }
});

app.post("/api/health/check-service", async (req, res) => {
  try {
    const { service } = req.body;
    const config = getConfig();

    if (!service || !["plex", "tautulli"].includes(service)) {
      return res.status(400).json({
        status: "error",
        error: "Invalid or missing service parameter",
      });
    }

    // Check Plex
    if (service === "plex") {
      if (!config.plexUrl || !config.plexToken) {
        return res.json({
          status: "unconfigured",
          message: "Plex is not configured",
        });
      }

      try {
        const response = await axios.get(`${config.plexUrl}/identity`, {
          headers: {
            "X-Plex-Token": config.plexToken,
            Accept: "application/json",
          },
          timeout: 8000,
        });

        return res.json({
          status: "online",
          message: "Plex is online",
          serverName: response.data?.MediaContainer?.friendlyName || null,
        });
      } catch (error) {
        logError("Plex service check failed:", error.message);
        return res.json({
          status: "offline",
          message: "Failed to connect to Plex",
          error: error.message,
        });
      }
    }

    // Check Tautulli
    if (service === "tautulli") {
      if (!config.tautulliUrl || !config.tautulliApiKey) {
        return res.json({
          status: "unconfigured",
          message: "Tautulli is not configured",
        });
      }

      try {
        // Using the simplest command to check status
        const response = await axios.get(`${config.tautulliUrl}/api/v2`, {
          params: {
            apikey: config.tautulliApiKey,
            cmd: "status",
          },
          timeout: 8000,
        });

        // Check if response indicates success
        if (response.data?.response?.result === "success") {
          return res.json({
            status: "online",
            message: "Tautulli is online",
            version: response.data.response.data?.version || null,
          });
        } else {
          return res.json({
            status: "offline",
            message: "Tautulli returned an invalid response",
            responseData: response.data,
          });
        }
      } catch (error) {
        logError("Tautulli service check failed:", error.message);
        return res.json({
          status: "offline",
          message: "Failed to connect to Tautulli",
          error: error.message,
        });
      }
    }
  } catch (error) {
    logError("Service check error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error during service check",
    });
  }
});

// Setup proxies
app.use("/api/plex", createDynamicProxy("Plex"));
app.use("/api/tautulli", createDynamicProxy("Tautulli"));

// ======================================================================
// Server Startup with Environment-Specific Banners
// ======================================================================

// Production banner - more professional, with red highlights for caution
const productionBanner = (version) => {
  return (
    chalk.white("╔════════════════════════════════════════════════════╗\n") +
    chalk.white("║") +
    "                                                    " +
    chalk.white("║\n") +
    chalk.white("║") +
    "            " +
    chalk.red.bold("Plex & Tautulli Dashboard") +
    "               " +
    chalk.white("║\n") +
    chalk.white("║") +
    "                " +
    chalk.red.bold("*** PRODUCTION ***") +
    "                  " +
    chalk.white("║\n") +
    chalk.white("╚════════════════════════════════════════════════════╝")
  );
};

// Development banner - more colorful and playful
const developmentBanner = (version) => {
  return (
    chalk.cyan("╔════════════════════════════════════════════════════╗\n") +
    chalk.cyan("║") +
    "                                                    " +
    chalk.cyan("║\n") +
    chalk.cyan("║") +
    "            " +
    chalk.yellow.bold("Plex & Tautulli Dashboard") +
    "               " +
    chalk.cyan("║\n") +
    chalk.cyan("║") +
    "                " +
    chalk.magenta.bold("~~ DEVELOPMENT ~~") +
    "                   " +
    chalk.cyan("║\n") +
    chalk.cyan("║") +
    "                                                    " +
    chalk.cyan("║\n") +
    chalk.cyan("╚════════════════════════════════════════════════════╝")
  );
};

// Fallback banner in case environment detection fails
const fallbackBanner = (version) => {
  return `
╔════════════════════════════════════════════════════╗
║                                                    ║
║            Plex & Tautulli Dashboard               ║
║                                                    ║
╚════════════════════════════════════════════════════╝`;
};

// Select banner based on environment
const selectBanner = (version) => {
  const environment = process.env.NODE_ENV || "development";

  if (environment === "production") {
    return productionBanner(version);
  } else if (environment === "development") {
    return developmentBanner(version);
  } else {
    // Fallback for unknown environments
    return fallbackBanner(version);
  }
};

const PORT = process.env.PORT || 3006;
app.listen(PORT, "0.0.0.0", () => {
  console.clear();

  // Display the appropriate banner based on environment
  console.log(selectBanner(appVersion));

  // Environment indicator for log clarity
  const environment = process.env.NODE_ENV || "development";
  const envColor =
    environment === "production" ? chalk.red.bold : chalk.green.bold;

  console.log("\nServer Information:");
  console.log("==================================");
  console.log(chalk.white.bold("Status:"), "Running");
  console.log(chalk.white.bold("Version:"), appVersion);
  console.log(chalk.white.bold("Environment:"), envColor(environment));
  console.log(chalk.white.bold("Time:"), new Date().toLocaleString());
  console.log(
    chalk.white.bold("\nListening on:"),
    chalk.blue(process.env.VITE_API_BASE_URL || `http://localhost:${PORT}`)
  );
  console.log(chalk.white.bold("Allowed CORS:"), ALLOWED_ORIGINS.join(", "));
  console.log("==================================\n");
  console.log("Current Service Configuration:");
  console.log("==================================\n");
  console.log(formatConfig(getConfig()));
  console.log("==================================\n");
});

// Export app for testing
export default app;
