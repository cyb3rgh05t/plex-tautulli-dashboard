import axios from "axios";
import { logError, logInfo, logDebug, logWarn } from "../utils/logger";

// TMDB API key
const TMDB_API_KEY = "e7d2628727fa893ec3692d18f8a4aec2";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

/**
 * Extract TMDB ID from a list of guids
 * @param {Array|String} guids - Array of guid strings or a single string
 * @returns {String|null} - TMDB ID or null if not found
 */
export const extractTmdbId = (guids) => {
  if (!guids) return null;

  // Handle both array and string formats
  const guidArray = Array.isArray(guids) ? guids : [guids];

  // Find a TMDB guid (format varies: tmdb://12345, themoviedb://12345, tmdb:12345)
  const tmdbGuid = guidArray.find(
    (guid) =>
      guid &&
      typeof guid === "string" &&
      (guid.includes("tmdb://") ||
        guid.includes("themoviedb://") ||
        guid.includes("tmdb:"))
  );

  if (!tmdbGuid) return null;

  // Extract the ID from various possible formats
  const match = tmdbGuid.match(
    /tmdb:\/\/(\d+)|themoviedb:\/\/(\d+)|tmdb:(\d+)/
  );
  if (!match) return null;

  // Return the first matching group
  return match[1] || match[2] || match[3] || null;
};

/**
 * Get poster URL for a movie from TMDB
 * @param {String} tmdbId - TMDB ID for the movie
 * @returns {Promise<String|null>} - URL to poster or null if not found
 */
export const getMoviePoster = async (tmdbId) => {
  if (!tmdbId) return null;

  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
      params: {
        api_key: TMDB_API_KEY,
      },
      timeout: 5000, // 5 second timeout
    });

    if (response.data && response.data.poster_path) {
      logDebug(`Got TMDB movie poster for ID ${tmdbId}`);
      return `https://image.tmdb.org/t/p/w500${response.data.poster_path}`;
    }
    return null;
  } catch (error) {
    logError(`Error fetching movie poster for TMDB ID ${tmdbId}:`, error);
    return null;
  }
};

/**
 * Get TV show poster from TMDB
 * @param {String} tmdbId - TMDB ID for the TV show
 * @returns {Promise<String|null>} - URL to poster or null if not found
 */
export const getTvShowPoster = async (tmdbId) => {
  if (!tmdbId) return null;

  try {
    const response = await axios.get(`${TMDB_BASE_URL}/tv/${tmdbId}`, {
      params: {
        api_key: TMDB_API_KEY,
      },
      timeout: 5000,
    });

    if (response.data && response.data.poster_path) {
      logDebug(`Got TMDB TV show poster for ID ${tmdbId}`);
      return `https://image.tmdb.org/t/p/w500${response.data.poster_path}`;
    }
    return null;
  } catch (error) {
    logError(`Error fetching TV show poster for TMDB ID ${tmdbId}:`, error);
    return null;
  }
};

/**
 * Get season poster from TMDB
 * @param {String} tmdbId - TMDB ID for the TV show
 * @param {Number} seasonNumber - Season number
 * @returns {Promise<String|null>} - URL to poster or null if not found
 */
export const getSeasonPoster = async (tmdbId, seasonNumber) => {
  if (!tmdbId || !seasonNumber) return null;

  try {
    const response = await axios.get(
      `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}`,
      {
        params: {
          api_key: TMDB_API_KEY,
        },
        timeout: 5000,
      }
    );

    if (response.data && response.data.poster_path) {
      logDebug(
        `Got TMDB season poster for ID ${tmdbId}, season ${seasonNumber}`
      );
      return `https://image.tmdb.org/t/p/w500${response.data.poster_path}`;
    }

    // If no season poster, return null to allow fallback to TV show poster
    logDebug(
      `No specific season poster found for ID ${tmdbId}, season ${seasonNumber}`
    );
    return null;
  } catch (error) {
    logError(
      `Error fetching season poster for TMDB ID ${tmdbId}, season ${seasonNumber}:`,
      error
    );
    return null;
  }
};

/**
 * Get episode still from TMDB
 * @param {String} tmdbId - TMDB ID for the TV show
 * @param {Number} seasonNumber - Season number
 * @param {Number} episodeNumber - Episode number
 * @returns {Promise<String|null>} - URL to still image or null if not found
 */
export const getEpisodeStill = async (tmdbId, seasonNumber, episodeNumber) => {
  if (!tmdbId || !seasonNumber || !episodeNumber) return null;

  try {
    const response = await axios.get(
      `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`,
      {
        params: {
          api_key: TMDB_API_KEY,
        },
        timeout: 5000,
      }
    );

    if (response.data && response.data.still_path) {
      logDebug(
        `Got TMDB episode still for ID ${tmdbId}, S${seasonNumber}E${episodeNumber}`
      );
      return `https://image.tmdb.org/t/p/w500${response.data.still_path}`;
    }

    // If no episode still, return null to allow fallback to season poster
    logDebug(
      `No specific episode still found for ID ${tmdbId}, S${seasonNumber}E${episodeNumber}`
    );
    return null;
  } catch (error) {
    logError(
      `Error fetching episode still for TMDB ID ${tmdbId}, S${seasonNumber}E${episodeNumber}:`,
      error
    );
    return null;
  }
};

/**
 * Get poster based on media type with robust fallback hierarchy
 * @param {String} mediaType - Type of media (movie, show, season, episode)
 * @param {Object} mediaInfo - Media information object
 * @returns {Promise<String|null>} - URL to poster or null if not found
 */
export const getPosterByMediaType = async (mediaType, mediaInfo) => {
  if (!mediaType || !mediaInfo) return null;

  let tmdbId;
  let posterUrl = null;

  // Normalize media type
  const type = mediaType.toLowerCase();
  logDebug(`Getting TMDB poster for media type: ${type}`);

  try {
    switch (type) {
      case "movie":
        // For movies, use the movie's own GUID
        tmdbId = extractTmdbId(mediaInfo.guids);
        if (tmdbId) {
          posterUrl = await getMoviePoster(tmdbId);
          if (posterUrl) {
            logInfo(
              `Successfully got TMDB movie poster for "${
                mediaInfo.title || "Unknown Movie"
              }"`
            );
          }
        }
        break;

      case "show":
        // For TV shows, use the show's own GUID
        tmdbId = extractTmdbId(mediaInfo.guids);
        if (tmdbId) {
          posterUrl = await getTvShowPoster(tmdbId);
          if (posterUrl) {
            logInfo(
              `Successfully got TMDB TV show poster for "${
                mediaInfo.title || "Unknown Show"
              }"`
            );
          }
        }
        break;

      case "season":
        // For seasons, try to get the season poster first, then fall back to TV show poster

        // First try grandparent_guids (if it's available) as it's the show ID
        tmdbId = extractTmdbId(mediaInfo.grandparent_guids);

        // If not found, try the season's own guids
        if (!tmdbId) {
          tmdbId = extractTmdbId(mediaInfo.guids);
        }

        if (tmdbId && mediaInfo.parent_media_index) {
          // Try to get season-specific poster first
          posterUrl = await getSeasonPoster(
            tmdbId,
            mediaInfo.parent_media_index
          );

          // If season poster not available, fall back to TV show poster
          if (!posterUrl) {
            logDebug(
              `No season poster found, falling back to TV show poster for season ${mediaInfo.parent_media_index}`
            );
            posterUrl = await getTvShowPoster(tmdbId);
          }

          if (posterUrl) {
            logInfo(
              `Successfully got TMDB poster for "${
                mediaInfo.title || "Unknown Season"
              }"`
            );
          }
        }
        break;

      case "episode":
        // For episodes, use the show's ID from grandparent_guids
        tmdbId = extractTmdbId(mediaInfo.grandparent_guids);

        if (tmdbId) {
          // For episodes, we specifically want to use season or show posters, NOT episode stills

          // 1. Try season poster first
          if (mediaInfo.parent_media_index) {
            posterUrl = await getSeasonPoster(
              tmdbId,
              mediaInfo.parent_media_index
            );
          }

          // 2. Fall back to TV show poster if no season poster
          if (!posterUrl) {
            logDebug(
              `No season poster found for episode, using TV show poster instead`
            );
            posterUrl = await getTvShowPoster(tmdbId);
          }

          if (posterUrl) {
            logInfo(
              `Successfully got TMDB poster for "${
                mediaInfo.grandparent_title || ""
              }: ${mediaInfo.title || "Unknown Episode"}"`
            );
          }
        }
        break;

      default:
        logWarn(`Unsupported media type: ${type}`);
        return null;
    }

    return posterUrl;
  } catch (error) {
    logError(`Error getting poster for ${mediaType}:`, error);
    return null;
  }
};

/**
 * Store poster URL in local storage for caching
 * @param {String} key - Unique identifier for the poster (rating_key)
 * @param {String} url - Poster URL
 * @param {Number} ttl - Time to live in milliseconds (default: 7 days)
 */
export const cachePosterUrl = (key, url, ttl = 7 * 24 * 60 * 60 * 1000) => {
  if (!key || !url) return;

  try {
    const posterCache = JSON.parse(
      localStorage.getItem("tmdbPosterCache") || "{}"
    );

    posterCache[key] = {
      url,
      expires: Date.now() + ttl,
    };

    localStorage.setItem("tmdbPosterCache", JSON.stringify(posterCache));
    logDebug(`Cached poster for key ${key}`);
  } catch (error) {
    logError("Error caching poster URL:", error);
  }
};

/**
 * Get cached poster URL
 * @param {String} key - Unique identifier for the poster (rating_key)
 * @returns {String|null} - Cached poster URL or null if not found or expired
 */
export const getCachedPosterUrl = (key) => {
  if (!key) return null;

  try {
    const posterCache = JSON.parse(
      localStorage.getItem("tmdbPosterCache") || "{}"
    );
    const cached = posterCache[key];

    if (cached && cached.url && cached.expires > Date.now()) {
      return cached.url;
    }

    // Remove expired entry
    if (cached) {
      delete posterCache[key];
      localStorage.setItem("tmdbPosterCache", JSON.stringify(posterCache));
    }

    return null;
  } catch (error) {
    logError("Error retrieving cached poster URL:", error);
    return null;
  }
};

/**
 * Clear expired poster URLs from cache
 */
export const clearExpiredPosters = () => {
  try {
    const posterCache = JSON.parse(
      localStorage.getItem("tmdbPosterCache") || "{}"
    );
    const now = Date.now();
    let expiredCount = 0;

    for (const key in posterCache) {
      if (posterCache[key].expires < now) {
        delete posterCache[key];
        expiredCount++;
      }
    }

    localStorage.setItem("tmdbPosterCache", JSON.stringify(posterCache));
    if (expiredCount > 0) {
      logInfo(`Cleared ${expiredCount} expired posters from cache`);
    }
  } catch (error) {
    logError("Error clearing expired posters:", error);
  }
};

/**
 * Clear entire poster cache
 */
export const clearPosterCache = () => {
  try {
    localStorage.removeItem("tmdbPosterCache");
    logInfo("Poster cache cleared");
  } catch (error) {
    logError("Error clearing poster cache:", error);
  }
};

export default {
  extractTmdbId,
  getMoviePoster,
  getTvShowPoster,
  getSeasonPoster,
  getEpisodeStill,
  getPosterByMediaType,
  cachePosterUrl,
  getCachedPosterUrl,
  clearExpiredPosters,
  clearPosterCache,
};
