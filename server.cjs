const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { getConfig, setConfig } = require("./configStore.cjs");
const { getFormats, saveFormats } = require("./formatStore.cjs");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Add this near the top of your existing server.cjs file, with other imports
const SAVED_SECTIONS_PATH = path.join(__dirname, "sections.json");

const app = express();

// List of all allowed Plex headers
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

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // List of allowed origins from environment variable
      const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
        : ["http://localhost:3005"];

      // Check if '*' is specified (allow all origins)
      if (ALLOWED_ORIGINS.includes("*")) {
        return callback(null, true);
      }

      // Check if the origin matches any allowed origin
      const isAllowed = ALLOWED_ORIGINS.some((allowedOrigin) => {
        // Exact match
        if (origin === allowedOrigin) return true;

        // Wildcard subdomain match
        if (allowedOrigin.startsWith("*.")) {
          const domain = allowedOrigin.slice(2);
          return new URL(origin).hostname.endsWith(domain);
        }

        return false;
      });

      if (isAllowed) {
        return callback(null, true);
      }

      // Reject if not in allowed origins
      callback(new Error("Not allowed by CORS policy"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", ...PLEX_HEADERS],
  })
);

app.use(express.json());

// OPTIONS preflight handler
app.options("*", cors());

// Debug logging middleware
app.use((req, res, next) => {
  console.log("Request:", {
    method: req.method,
    url: req.url,
    headers: req.headers,
  });
  next();
});

// Add these helper functions at the top of server.cjs, before the endpoints

// Date formatting helper
const formatDate = (timestamp, format = "default") => {
  const addedDate = new Date(Number(timestamp) * 1000);
  const now = new Date();
  const diffMs = now - addedDate;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  switch (format) {
    case "short":
      return addedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

    case "relative":
      if (diffSeconds < 60)
        return `${diffSeconds} second${diffSeconds !== 1 ? "s" : ""} ago`;
      if (diffMinutes < 60)
        return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
      if (diffHours < 24)
        return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
      if (diffDays < 30)
        return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
      return addedDate.toLocaleDateString();

    case "full":
      return addedDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    case "time":
      return addedDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

    default:
      return addedDate.toLocaleDateString();
  }
};

// Helper for two-digit padding
const padTwoDigits = (num) => String(num).padStart(2, "0");

// Format show episode helper
const formatShowEpisode = (seasonNumber, episodeNumber) => {
  const paddedSeason = padTwoDigits(seasonNumber);
  const paddedEpisode = padTwoDigits(episodeNumber);
  return `S${paddedSeason}E${paddedEpisode}`;
};

// Template processing function
const processTemplate = (template, data) => {
  if (!template) return "";

  let result = template;
  const variables = template.match(/\{([^}]+)\}/g) || [];

  variables.forEach((variable) => {
    // Extract variable and optional format
    const match = variable.slice(1, -1).split(":");
    const key = match[0];
    const format = match[1];

    let value = data[key];

    // Special handling for timestamp
    if (key === "addedAt") {
      value = formatDate(value, format);
    }

    // Special handling for show episode formatting
    if (data.mediaType === "episode") {
      if (key === "parent_media_index" || key === "media_index") {
        value = formatShowEpisode(data.parent_media_index, data.media_index);
        // Replace the entire variable with the formatted episode string
        result = result.replace(
          /\{parent_media_index\}E\{media_index\}/,
          value
        );
        return;
      }
    }

    if (value !== undefined) {
      result = result.replace(variable, value);
    }
  });

  return result;
};

// Format management endpoints

app.post("/api/formats", (req, res) => {
  try {
    const { type, formats } = req.body;

    if (!type || !Array.isArray(formats)) {
      return res.status(400).json({ error: "Invalid format data" });
    }

    // Get current formats
    const allFormats = getFormats();

    // For recentlyAdded formats, maintain other media types
    if (type === "recentlyAdded") {
      const mediaType = formats.length > 0 ? formats[0].type : null;

      if (mediaType) {
        // Keep formats of other media types
        const otherFormats = allFormats.recentlyAdded.filter(
          (format) => format.type !== mediaType
        );

        // Combine with new formats
        allFormats.recentlyAdded = [...otherFormats, ...formats];
      } else {
        // If no mediaType (empty formats array), just save the empty array
        allFormats.recentlyAdded = formats;
      }
    } else {
      // For other types (downloads, users, etc.), just replace the array
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
    console.error("Error saving formats:", error);
    res.status(500).json({
      error: "Failed to save formats",
      message: error.message,
    });
  }
});

app.get("/api/formats", (req, res) => {
  try {
    const formats = getFormats();
    res.json({
      downloads: formats.downloads || [],
      recentlyAdded: formats.recentlyAdded || [],
      sections: formats.sections || [],
      users: formats.users || [], // Add users array to response
    });
  } catch (error) {
    console.error("Error reading formats:", error);
    res.status(500).json({ error: "Failed to read formats" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const config = getConfig();
    let allUsers = [];
    let start = 0;
    let hasMore = true;

    // Get all users first
    while (hasMore) {
      const response = await axios.get(`${config.tautulliUrl}/api/v2`, {
        params: {
          apikey: config.tautulliApiKey,
          cmd: "get_users_table",
          start: start,
        },
      });

      if (response.data?.response?.result !== "success") {
        throw new Error("Failed to fetch users data");
      }

      const users = response.data.response.data.data;
      if (!users || users.length === 0) {
        hasMore = false;
      } else {
        allUsers = [...allUsers, ...users];
        start += 25;
      }
    }

    // Get stored formats
    const formats = getFormats();
    const userFormats = formats.users || [];

    // Filter out Local users
    const filteredUsers = allUsers.filter(
      (user) => user.friendly_name !== "Local"
    );

    // Fetch history for each user
    const usersWithHistory = await Promise.all(
      filteredUsers.map(async (user) => {
        try {
          const historyResponse = await axios.get(
            `${config.tautulliUrl}/api/v2`,
            {
              params: {
                apikey: config.tautulliApiKey,
                cmd: "get_history",
                user_id: user.user_id,
                length: 1, // Only get the most recent item
              },
            }
          );

          const historyItem =
            historyResponse.data?.response?.data?.data[0] || {};

          return {
            ...user,
            state:
              historyItem.state === "playing"
                ? "watching"
                : historyItem.state === null
                ? "watched"
                : historyItem.state || "watched",
            last_played_at: historyItem.date || null,
            media_type: historyItem.media_type || "movie",
            // Media details - Common
            title: historyItem.title || "",
            original_title: historyItem.original_title || "",
            year: historyItem.year || "",
            // Show-specific details
            full_title: historyItem.full_title || "",
            parent_title: historyItem.parent_title || "",
            grandparent_title: historyItem.grandparent_title || "",
            media_index: historyItem.media_index || "",
            parent_media_index: historyItem.parent_media_index || "",
          };
        } catch (error) {
          console.error(
            `Failed to fetch history for user ${user.user_id}:`,
            error
          );
          return {
            ...user,
            state: "watched",
            last_played_at: null,
            media_type: "movie",
            // Set default empty values for all media fields
            title: "",
            original_title: "",
            year: "",
            full_title: "",
            parent_title: "",
            grandparent_title: "",
            media_index: "",
            parent_media_index: "",
          };
        }
      })
    );

    // Sort by last_played_at
    const sortedUsers = usersWithHistory.sort((a, b) => {
      if (!a.last_played_at && !b.last_played_at) return 0;
      if (!a.last_played_at) return 1;
      if (!b.last_played_at) return -1;
      return b.last_played_at - a.last_played_at;
    });

    // Apply formats to each user
    const formattedUsers = sortedUsers.map((user) => {
      const formattedOutput = {};
      // Filter formats based on media type
      const applicableFormats = userFormats.filter(
        (format) => format.mediaType === user.media_type
      );

      applicableFormats.forEach((format) => {
        let result = format.template;
        Object.entries(user).forEach(([key, value]) => {
          let formattedValue = value;
          if (key === "duration") {
            formattedValue = Math.round(value / 3600) + " hrs";
          } else if (key === "last_seen" || key === "last_played_at") {
            formattedValue = value
              ? new Date(value * 1000).toLocaleString()
              : "Never";
          } else if (key === "is_active") {
            formattedValue = value ? "Active" : "Inactive";
          } else if (key === "media_index" || key === "parent_media_index") {
            formattedValue = value ? String(value).padStart(2, "0") : "";
          }
          result = result.replace(
            new RegExp(`{${key}}`, "g"),
            formattedValue || ""
          );
        });
        formattedOutput[format.name] = result;
      });

      return {
        ...user,
        formatted: formattedOutput,
      };
    });

    res.json({
      success: true,
      total: formattedUsers.length,
      users: formattedUsers,
    });
  } catch (error) {
    console.error("Error processing formatted users:", error);
    res.status(500).json({
      error: "Failed to process users",
      message: error.message,
    });
  }
});

// Downloads endpoint with format processing
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

    // Process the data
    const processedData = {
      total: plexResponse.data?.MediaContainer?.Activity?.length || 0,
      activities:
        plexResponse.data?.MediaContainer?.Activity?.map((activity) => ({
          uuid: activity.uuid,
          title: activity.title,
          subtitle: activity.subtitle,
          progress: activity.progress,
          type: activity.type,
        })) || [],
    };

    res.json(processedData);
  } catch (error) {
    console.error("Error processing downloads:", error);
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

    const response = await axios.get(`${config.tautulliUrl}/api/v2`, {
      params: {
        apikey: config.tautulliApiKey,
        cmd: "get_libraries_table",
      },
    });

    if (response.data?.response?.result !== "success") {
      throw new Error("Failed to fetch libraries data");
    }

    // Send just the libraries array
    res.json(response.data.response.data.data);
  } catch (error) {
    console.error("Error fetching libraries:", error);
    res.status(500).json({
      error: "Failed to fetch libraries",
      message: error.message,
      details: error.response?.data || error.stack,
    });
  }
});

// Saved sections GET endpoint
app.get("/api/sections", (req, res) => {
  try {
    // Ensure the file exists, create if not
    if (!fs.existsSync(SAVED_SECTIONS_PATH)) {
      fs.writeFileSync(SAVED_SECTIONS_PATH, JSON.stringify([], null, 2));
    }

    // Read saved sections
    const rawData = fs.readFileSync(SAVED_SECTIONS_PATH, "utf8");
    const savedSections = JSON.parse(rawData);

    res.json({
      total: savedSections.length,
      sections: savedSections,
    });
  } catch (error) {
    console.error("Error reading saved sections:", error);
    res.status(500).json({
      error: "Failed to read saved sections",
      message: error.message,
    });
  }
});

// Save sections POST endpoint
app.post("/api/sections", (req, res) => {
  try {
    const sections = req.body;

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

    // Write sections to file
    fs.writeFileSync(SAVED_SECTIONS_PATH, JSON.stringify(sections, null, 2));

    res.json({
      success: true,
      total: sections.length,
      sections: sections,
      message: `Successfully saved ${sections.length} sections`,
    });
  } catch (error) {
    console.error("Error saving sections:", error);
    res.status(500).json({
      error: "Failed to save sections",
      message: error.message,
    });
  }
});

// New endpoint for recently added media by type
// In server.cjs, update the /api/recent/:type endpoint:

app.get("/api/recent/:type", async (req, res) => {
  try {
    const config = getConfig();
    const { type } = req.params;
    const { section } = req.query;

    // Validate type
    const validTypes = {
      movies: "movie",
      shows: "show",
      music: "artist",
    };

    if (!validTypes[type]) {
      return res.status(400).json({ error: "Invalid media type" });
    }

    // Fetch sections
    const sectionsResponse = await axios.get(
      "http://localhost:3006/api/sections"
    );
    const allSections = sectionsResponse.data.sections;

    // Get formats
    const formatsData = getFormats();
    const recentlyAddedFormats = formatsData.recentlyAdded || [];

    // Filter sections by type
    const matchingSections = allSections.filter((s) => {
      const matchesType = s.type.toLowerCase() === validTypes[type];
      return matchesType;
    });

    if (matchingSections.length === 0) {
      return res.json({ total: 0, media: [] });
    }

    // Fetch media for each section and its metadata
    const sectionMediaPromises = matchingSections.map(async (section) => {
      try {
        // First get the recently added items
        const response = await axios.get(`${config.tautulliUrl}/api/v2`, {
          params: {
            apikey: config.tautulliApiKey,
            cmd: "get_recently_added",
            section_id: section.section_id,
            count: 10,
          },
        });

        const mediaItems = response.data?.response?.data?.recently_added || [];

        // For each media item, fetch its metadata
        const mediaWithMetadataPromises = mediaItems.map(async (item) => {
          try {
            const metadataResponse = await axios.get(
              `${config.tautulliUrl}/api/v2`,
              {
                params: {
                  apikey: config.tautulliApiKey,
                  cmd: "get_metadata",
                  rating_key: item.rating_key,
                },
              }
            );

            return {
              ...item,
              section_id: section.section_id,
              video_full_resolution:
                metadataResponse.data?.response?.data?.media_info?.[0]
                  ?.video_full_resolution || "Unknown",
            };
          } catch (error) {
            console.error(
              `Failed to fetch metadata for ${item.rating_key}:`,
              error
            );
            return {
              ...item,
              section_id: section.section_id,
              video_full_resolution: "Unknown",
            };
          }
        });

        // Wait for all metadata requests to complete
        return Promise.all(mediaWithMetadataPromises);
      } catch (error) {
        console.error(
          `Error fetching recently added for section ${section.section_id}:`,
          error
        );
        return [];
      }
    });

    const allSectionMedia = await Promise.all(sectionMediaPromises);
    const combinedMedia = allSectionMedia.flat();

    // Process media with formats
    const processedMedia = combinedMedia.map((media) => {
      const baseData = {
        title: media.title,
        year: media.year,
        mediaType: media.media_type,
        addedAt: media.added_at,
        summary: media.summary,
        rating: media.rating,
        contentRating: media.content_rating,
        video_full_resolution: media.video_full_resolution,
        section_id: media.section_id,
      };

      if (type === "shows") {
        baseData.grandparent_title = media.grandparent_title;
        baseData.parent_media_index = media.parent_media_index;
        baseData.media_index = media.media_index;
      }

      const formattedData = {};

      // Apply formats based on section_id
      recentlyAddedFormats.forEach((format) => {
        if (
          format.type === type &&
          (format.sectionId === "all" ||
            format.sectionId === media.section_id.toString())
        ) {
          formattedData[format.name] = processTemplate(
            format.template,
            baseData
          );
        }
      });

      return {
        ...formattedData,
        raw_data: baseData,
      };
    });

    // Sort by added date (newest first)
    const sortedMedia = processedMedia.sort(
      (a, b) => parseInt(b.raw_data.addedAt) - parseInt(a.raw_data.addedAt)
    );

    res.json({
      total: sortedMedia.length,
      media: sortedMedia,
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
    });
  } catch (error) {
    console.error("Error processing recently added media:", error);
    res.status(500).json({
      error: "Failed to process recently added media",
      message: error.message,
      details: error.response?.data || error.stack,
    });
  }
});

// Configuration endpoint
app.post("/api/config", (req, res) => {
  const { plexUrl, plexToken, tautulliUrl, tautulliApiKey } = req.body;

  console.log("Received config update:", {
    plexUrl,
    plexToken,
    tautulliUrl,
    tautulliApiKey,
  });

  const currentConfig = getConfig();

  // Merge new config with existing, preserving existing values if not provided
  const updatedConfig = {
    plexUrl: plexUrl || currentConfig.plexUrl,
    plexToken: plexToken || currentConfig.plexToken,
    tautulliUrl: tautulliUrl || currentConfig.tautulliUrl,
    tautulliApiKey: tautulliApiKey || currentConfig.tautulliApiKey,
  };

  console.log("Updated config:", updatedConfig);

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

// In server.cjs, add this endpoint
app.get("/api/config", (req, res) => {
  const config = getConfig();
  res.json({
    plexUrl: config.plexUrl,
    tautulliUrl: config.tautulliUrl,
    plexToken: config.plexToken,
    tautulliApiKey: config.tautulliApiKey,
  });
});

const createDynamicProxy = (serviceName, options = {}) => {
  return (req, res, next) => {
    const config = getConfig();
    const target = serviceName === "Plex" ? config.plexUrl : config.tautulliUrl;

    if (!target) {
      return res
        .status(500)
        .json({ error: `${serviceName} URL not configured` });
    }

    console.log(`${serviceName} Proxy Request:`, {
      method: req.method,
      url: req.url,
      target: target,
    });

    const proxy = createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: false,
      timeout: 30000, // 30 seconds timeout
      proxyTimeout: 30000, // 30 seconds proxy timeout
      pathRewrite: (path) => {
        const newPath = path.replace(
          new RegExp(`^/api/${serviceName.toLowerCase()}`),
          ""
        );
        console.log("Path rewrite:", { from: path, to: newPath });
        return newPath;
      },
      onProxyReq: (proxyReq, req, res) => {
        if (serviceName === "Plex" && config.plexToken) {
          // Add Plex headers
          proxyReq.setHeader(
            "X-Plex-Client-Identifier",
            "PlexTautulliDashboard"
          );
          proxyReq.setHeader("X-Plex-Product", "Plex Tautulli Dashboard");
          proxyReq.setHeader("X-Plex-Version", "1.0.0");

          // Add token if not in URL
          if (!req.query["X-Plex-Token"]) {
            proxyReq.setHeader("X-Plex-Token", config.plexToken);
          }
        }

        console.log("Proxying request:", {
          url: proxyReq.path,
          headers: proxyReq.getHeaders(),
        });
      },
      onProxyRes: (proxyRes, req, res) => {
        proxyRes.headers["Access-Control-Allow-Origin"] =
          "http://localhost:3005";
        proxyRes.headers["Access-Control-Allow-Headers"] = [
          "Content-Type",
          "Authorization",
          ...PLEX_HEADERS,
        ].join(", ");
      },
      onError: (err, req, res) => {
        console.error(`${serviceName} Proxy Error:`, {
          message: err.message,
          stack: err.stack,
          code: err.code,
        });
        res.status(500).json({
          error: `${serviceName} Proxy Error`,
          message: err.message,
          code: err.code,
        });
      },
      ...options,
    });

    return proxy(req, res, next);
  };
};

// In server.cjs
app.post("/api/reset-all", (req, res) => {
  try {
    const configPath = path.join(__dirname, "config.json");
    const formatsPath = path.join(__dirname, "formats.json");
    const savedSectionsPath = path.join(__dirname, "sections.json");

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

    // Reset saved_sections.json to an empty array
    fs.writeFileSync(savedSectionsPath, JSON.stringify([], null, 2));

    // Log the reset action
    console.log("All configurations have been reset:", {
      configPath,
      formatsPath,
      savedSectionsPath,
    });

    res.json({
      status: "success",
      message: "All configurations reset successfully",
    });
  } catch (error) {
    console.error("Failed to reset configurations:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to reset configurations",
      details: error.message,
    });
  }
});

// Setup proxies
app.use("/api/plex", createDynamicProxy("Plex"));
app.use("/api/tautulli", createDynamicProxy("Tautulli"));

// Health check endpoint
app.get("/health", (req, res) => {
  const config = getConfig();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    config: {
      plexUrl: config.plexUrl || "Not configured",
      tautulliUrl: config.tautulliUrl || "Not configured",
      hasPlexToken: !!config.plexToken,
      hasTautulliKey: !!config.tautulliApiKey,
    },
  });
});

const PROXY_PORT = process.env.PORT || 3006;
app.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log(`Proxy server running on http://0.0.0.0:${PROXY_PORT}`);
  console.log("Current configuration:", getConfig());
  console.log("API endpoints:");
  console.log("  - GET /api/downloads");
  console.log("  - GET /api/formats");
  console.log("  - POST /api/formats");
  console.log("  - GET /api/libraries");
  console.log("  - GET /api/sections");
});
