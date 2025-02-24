require("dotenv").config({ path: ".env" });
const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { getConfig, setConfig } = require("./src/utils/configStore.cjs");
const { getFormats, saveFormats } = require("./src/utils/formatStore.cjs");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Constants and Configuration
const SAVED_SECTIONS_PATH = path.join(
  process.cwd(),
  "configs",
  "sections.json"
);

const PROXY_TIMEOUT = parseInt(process.env.PROXY_TIMEOUT) || 30000;
const PROXY_READ_TIMEOUT = parseInt(process.env.PROXY_READ_TIMEOUT) || 30000;
const PROXY_WRITE_TIMEOUT = parseInt(process.env.PROXY_WRITE_TIMEOUT) || 30000;

// Ensure required directories exist
const ensureDirectories = () => {
  const dirs = [path.dirname(SAVED_SECTIONS_PATH)];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

// Initialize directories
ensureDirectories();

const app = express();

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
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3005"]; // Default fallback

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || ALLOWED_ORIGINS.includes("*")) {
      return callback(null, true);
    }

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.log("Origin not allowed by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", ...PLEX_HEADERS],
  exposedHeaders: ["Access-Control-Allow-Origin"],
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json());
app.options("*", cors(corsOptions));

// Logging middleware
app.use((req, res, next) => {
  console.log("Request:", {
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

// Date formatting helper
// Updated formatDate function for relative time formatting
const formatDate = (timestamp, format = "default") => {
  // Return early if no timestamp
  if (!timestamp) return "Never";

  // Convert timestamp to milliseconds if needed
  const timestampMs =
    String(timestamp).length === 10 ? timestamp * 1000 : timestamp;
  const date = new Date(timestampMs);
  const now = new Date();

  // Ensure we have a valid date
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }

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
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
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

// Add this function to help fetch library details
const getLibraryDetails = async (sectionId, config) => {
  try {
    // Get library stats
    const statsResponse = await axios.get(`${config.tautulliUrl}/api/v2`, {
      params: {
        apikey: config.tautulliApiKey,
        cmd: "get_library_media_info",
        section_id: sectionId,
      },
    });

    // Get watch statistics
    const watchStatsResponse = await axios.get(`${config.tautulliUrl}/api/v2`, {
      params: {
        apikey: config.tautulliApiKey,
        cmd: "get_library_watch_time_stats",
        section_id: sectionId,
      },
    });

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
    console.error(
      `Error fetching library details for section ${sectionId}:`,
      error
    );
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

    if (type === "recentlyAdded") {
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

// Update the media endpoint
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
        ...media,
        formatted: formattedData,
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
    console.error(`Error fetching ${req.params.type}:`, error);
    res.status(500).json({
      error: `Failed to fetch ${req.params.type}`,
      message: error.message,
    });
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
            // Use the formatDate function to handle different formats
            const match = format.template.match(new RegExp(`{${key}:([^}]+)}`));
            const formatType = match ? match[1] : "default";
            formattedValue = value ? formatDate(value, formatType) : "Never";
          } else if (key === "is_active") {
            formattedValue = value ? "Active" : "Inactive";
          } else if (key === "media_index" || key === "parent_media_index") {
            formattedValue = value ? String(value).padStart(2, "0") : "";
          }
          result = result.replace(
            new RegExp(`{${key}(:[^}]+)?}`, "g"),
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

          const formattedData = {};
          formats.forEach((format) => {
            formattedData[format.name] = processTemplate(
              format.template,
              baseData
            );
          });

          return {
            ...baseData,
            formatted: formattedData,
          };
        }) || [],
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
// Update the sections GET endpoint
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
      const applicableFormats = formats.filter(
        (format) =>
          format.sectionId === "all" ||
          format.sectionId === section.section_id.toString()
      );

      const formattedData = {};
      applicableFormats.forEach((format) => {
        formattedData[format.name] = processTemplate(format.template, {
          section_id: section.section_id,
          section_name: section.name,
          section_type: section.type,
          count: section.count || 0,
          parent_count: section.parent_count || 0,
          child_count: section.child_count || 0,
          last_accessed: section.last_accessed,
          last_updated: section.last_updated,
        });
      });

      return {
        ...section,
        formatted: formattedData,
      };
    });

    res.json({
      total: formattedSections.length,
      sections: formattedSections,
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
          console.log(`Fetching details for section ${section.section_id}`);

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
            console.error("Library response error:", libraryResponse.data);
            throw new Error("Failed to fetch library details");
          }

          const libraryData = libraryResponse.data?.response?.data?.data || [];
          const libraryDetails =
            libraryData.find((lib) => lib.section_id === section.section_id) ||
            {};

          console.log(
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

          const stats = statsResponse.data?.response?.data || {};
          const watchStats = watchStatsResponse.data?.response?.data || {};

          return {
            ...section,
            count: stats.count || 0,
            parent_count: stats.parent_count || 0,
            child_count: stats.child_count || 0,
            total_plays: watchStats.total_plays || 0,
            last_accessed: watchStats.last_accessed || null,
            last_played: watchStats.last_played || null,
          };
        } catch (error) {
          console.error(
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
    console.error("Error saving sections:", error);
    res.status(500).json({
      error: "Failed to save sections",
      message: error.message,
    });
  }
});

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
        console.log(`${serviceName} path rewrite:`, {
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
        console.log(`${serviceName} proxy request:`, {
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
        console.log(`${serviceName} proxy response:`, {
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
        console.error(`${serviceName} proxy error:`, {
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

// Helper function to format configuration in the desired style
const formatConfig = (config) => {
  let output = "├── Current configuration:\n";
  Object.entries(config).forEach(([key, value]) => {
    // Redact sensitive values if key includes "token" or "apikey"
    const displayValue =
      key.toLowerCase().includes("token") ||
      key.toLowerCase().includes("apikey")
        ? value
          ? "[REDACTED]"
          : "Not set"
        : value || "Not set";
    output += `\t├── ${key}: ${displayValue},\n`;
  });
  output += "├──";
  return output;
};

const serverBanner = `
╔════════════════════════════════════════════════════╗
║                                                    ║
║            Plex & Tautulli Dashboard               ║
║                                                    ║
║                                                    ║
║                 by cyb3rgh05t                      ║
╚════════════════════════════════════════════════════╝`;

const endpointsBanner = `
📍 Available Endpoints:
|
├── GET /api/formats
│   └── Retrieves all Formats
│
├── GET  /api/users
│   └── Retrieves formatted User Activities
│
├── GET /api/downlaods
│   └── Retrieves formatted Plex Downloads
│
├── GET /api/recent/movies
│   └── Retrieves formatted Movies info
│
├── GET /api/recent/shows
│   └── Retrieves formatted Shows info
│
├── GET /api/libraries
│   └── Retrieves all Plex Media Libraries
│
├── GET /api/sections
│   └── Retrieves saved Media Sections
│
└── GET  /api/config
    └── Get current Server configuration`;

const PORT = process.env.PORT || 3006;
app.listen(PORT, "0.0.0.0", () => {
  // Changed from localhost to 0.0.0.0
  console.clear();
  //console.log(serverBanner);
  console.log("\n🚀 Server Information:");
  console.log("├── Status: Running");
  console.log(`├── Listening on: ${process.env.VITE_BACKEND_URL}`);
  console.log(`├── Allowed CORS: ${ALLOWED_ORIGINS}`);
  console.log(`├── Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("└── Time:", new Date().toLocaleString());
  //console.log(formatConfig(getConfig()));
  //console.log(endpointsBanner);
});
