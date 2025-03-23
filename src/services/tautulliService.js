import axios from "axios";
import { logError, logInfo, logDebug, logWarn } from "../utils/logger";
import * as tmdbService from "./tmdbService";

/**
 * Test the connection to the Tautulli server
 * @param {String} tautulliUrl - Tautulli server URL
 * @param {String} apiKey - Tautulli API key
 * @returns {Promise<Object>} - Connection test result
 */
export const testTautulliConnection = async (tautulliUrl, apiKey) => {
  try {
    // Configure the proxy first
    await axios.post(`/api/config`, {
      tautulliUrl,
    });

    try {
      const response = await axios.get("/api/tautulli/api/v2", {
        params: {
          apikey: apiKey,
          cmd: "get_server_info",
        },
        timeout: 30000, // Specific timeout for this request
      });

      if (!response.data?.response?.result === "success") {
        throw new Error("Invalid response from Tautulli server");
      }

      logInfo("Tautulli connection successful");
      return response.data?.response?.data;
    } catch (connectionError) {
      // More specific error handling
      if (connectionError.code === "ECONNABORTED") {
        throw new Error(
          `Tautulli connection timed out. Please check your server URL and network connection.`
        );
      }
      throw connectionError;
    }
  } catch (error) {
    logError("Tautulli connection failed", error);

    // More detailed error handling
    if (error.response?.status === 401) {
      throw new Error("Invalid Tautulli API key");
    }

    throw new Error(
      error.message ||
        "Failed to connect to Tautulli server. Please check your server URL and API key."
    );
  }
};

/**
 * Get image URL for a media item - tries TMDB first, then falls back to Tautulli
 * @param {String} imagePath - Plex thumbnail path
 * @param {String} apiKey - Tautulli API key
 * @param {Object} mediaItem - Optional media item with additional metadata
 * @returns {String|null} - URL to the image or null if not available
 */
export const getImageUrl = async (imagePath, apiKey, mediaItem = null) => {
  // If no imagePath provided, we can't get a Tautulli image
  if (!imagePath) return null;

  try {
    // Step 1: If we have a media item with a rating key, check for cached TMDB poster
    if (mediaItem?.rating_key) {
      const cachedTmdbPoster = tmdbService.getCachedPosterUrl(
        mediaItem.rating_key
      );
      if (cachedTmdbPoster) {
        logDebug(
          `Using cached TMDB poster for ${mediaItem.title || "media item"}`
        );
        return cachedTmdbPoster;
      }
    }

    // Step 2: If mediaItem has complete metadata, try to get a TMDB poster
    if (mediaItem && (mediaItem.guids || mediaItem.grandparent_guids)) {
      const mediaType = mediaItem.media_type?.toLowerCase() || "";
      const tmdbPoster = await tmdbService.getPosterByMediaType(
        mediaType,
        mediaItem
      );

      if (tmdbPoster) {
        // If we found a TMDB poster and have a rating key, cache it
        if (mediaItem.rating_key) {
          tmdbService.cachePosterUrl(mediaItem.rating_key, tmdbPoster);
          logDebug(
            `Cached new TMDB poster for ${mediaItem.title || "media item"}`
          );
        }
        return tmdbPoster;
      }
    }

    // Step 3: Fallback to Tautulli image proxy
    return `/api/tautulli/pms_image_proxy?img=${encodeURIComponent(
      imagePath
    )}&apikey=${apiKey}`;
  } catch (error) {
    logWarn(
      `Failed to get TMDB poster, falling back to Tautulli: ${error.message}`
    );
    // Fallback to Tautulli image
    return `/api/tautulli/pms_image_proxy?img=${encodeURIComponent(
      imagePath
    )}&apikey=${apiKey}`;
  }
};

/**
 * Get sync-version of image URL that doesn't do async TMDB lookup
 * @param {String} imagePath - Plex thumbnail path
 * @param {String} apiKey - Tautulli API key
 * @param {String} ratingKey - Optional rating key for TMDB cache lookup
 * @returns {String|null} - URL to the image or null if not available
 */
export const getImageUrlSync = (imagePath, apiKey, ratingKey = null) => {
  // If no imagePath provided, we can't get a Tautulli image
  if (!imagePath) return null;

  // Try to get cached TMDB poster if we have a rating key
  if (ratingKey) {
    const cachedTmdbPoster = tmdbService.getCachedPosterUrl(ratingKey);
    if (cachedTmdbPoster) return cachedTmdbPoster;
  }

  // Fallback to Tautulli image proxy
  return `/api/tautulli/pms_image_proxy?img=${encodeURIComponent(
    imagePath
  )}&apikey=${apiKey}`;
};

/**
 * Configure the proxy for Tautulli and Plex
 * @param {String} plexUrl - Plex server URL
 * @param {String} tautulliUrl - Tautulli server URL
 */
export const configureProxy = async (plexUrl, tautulliUrl) => {
  try {
    await axios.post(`/api/config`, {
      plexUrl,
      tautulliUrl,
    });
    logInfo("Proxy configuration updated");
  } catch (error) {
    logError("Failed to configure proxy", error);
    throw new Error("Failed to configure proxy server");
  }
};

/**
 * Fetch recently added media from Tautulli
 * @param {String} apiKey - Tautulli API key
 * @param {Number} count - Number of items to fetch (default: 50)
 * @param {Number} sectionId - Optional section ID to filter by
 * @returns {Promise<Array>} - Array of recently added media items
 */
export const fetchRecentlyAdded = async (
  apiKey,
  count = 50,
  sectionId = null
) => {
  try {
    const params = {
      apikey: apiKey,
      cmd: "get_recently_added",
      count: count,
    };

    // Add section_id if provided
    if (sectionId) {
      params.section_id = sectionId;
    }

    const response = await axios.get(`/api/tautulli/api/v2`, { params });

    if (!response.data?.response?.result === "success") {
      throw new Error("Invalid response from Tautulli server");
    }

    const recentlyAdded = response.data?.response?.data?.recently_added || [];
    logInfo("Fetched Tautulli recently added", { count: recentlyAdded.length });

    // Process each item to include API key for image loading
    const processedItems = await Promise.all(
      recentlyAdded.map(async (item) => {
        const enhancedItem = {
          id: item.rating_key,
          title: item.title,
          mediaType: item.media_type,
          addedAt: item.added_at,
          summary: item.summary,
          year: item.year,
          rating: item.rating,
          duration: item.duration,
          contentRating: item.content_rating,
          apiKey: apiKey,
          // Store original paths
          originalThumb: item.thumb,
          originalArt: item.art,
          // Allow easy access to these fields with consistent naming
          rating_key: item.rating_key,
        };

        // Try to get TMDB poster
        if (item.rating_key) {
          const cachedPoster = tmdbService.getCachedPosterUrl(item.rating_key);
          if (cachedPoster) {
            enhancedItem.tmdb_poster_url = cachedPoster;
            enhancedItem.thumb = cachedPoster; // Override thumb with TMDB URL
          } else {
            // Use Tautulli URL as fallback
            enhancedItem.thumb = getImageUrlSync(
              item.thumb,
              apiKey,
              item.rating_key
            );
          }
        } else {
          enhancedItem.thumb = getImageUrlSync(item.thumb, apiKey);
        }

        enhancedItem.art = getImageUrlSync(item.art, apiKey);

        return enhancedItem;
      })
    );

    return processedItems;
  } catch (error) {
    logError("Failed to fetch recently added media", error);
    throw new Error("Failed to fetch recently added media");
  }
};

/**
 * Get full metadata for a media item
 * @param {String} apiKey - Tautulli API key
 * @param {String} ratingKey - Rating key of the media item
 * @param {Boolean} includeChildren - Whether to include children (default: false)
 * @returns {Promise<Object>} - Media metadata
 */
export const getMetadata = async (
  apiKey,
  ratingKey,
  includeChildren = false
) => {
  try {
    const params = {
      apikey: apiKey,
      cmd: "get_metadata",
      rating_key: ratingKey,
    };

    if (includeChildren) {
      params.include_children = 1;
    }

    const response = await axios.get(`/api/tautulli/api/v2`, { params });

    if (!response.data?.response?.result === "success") {
      throw new Error("Invalid response from Tautulli server");
    }

    const metadata = response.data?.response?.data || {};

    // Try to get TMDB poster if appropriate
    if (metadata && metadata.media_type) {
      const tmdbPoster = await tmdbService.getPosterByMediaType(
        metadata.media_type.toLowerCase(),
        metadata
      );

      if (tmdbPoster) {
        // Cache and use the TMDB poster
        tmdbService.cachePosterUrl(ratingKey, tmdbPoster);
        metadata.tmdb_poster_url = tmdbPoster;
      }
    }

    return metadata;
  } catch (error) {
    logError(`Failed to fetch metadata for ${ratingKey}:`, error);
    throw new Error(`Failed to fetch metadata for ${ratingKey}`);
  }
};

/**
 * Clear Tautulli image cache for specific media items
 * @param {String} apiKey - Tautulli API key
 * @param {String} ratingKey - Rating key of the media item
 * @returns {Promise<Boolean>} - Success status
 */
export const clearImageCache = async (apiKey, ratingKey = null) => {
  try {
    // Clear image cache through API
    await axios.get("/api/clear-image-cache");

    // If we have a rating key, clear TMDB cache for it too
    if (ratingKey) {
      // Clear TMDB poster cache
      const tmdbCache = JSON.parse(
        localStorage.getItem("tmdbPosterCache") || "{}"
      );
      if (tmdbCache[ratingKey]) {
        delete tmdbCache[ratingKey];
        localStorage.setItem("tmdbPosterCache", JSON.stringify(tmdbCache));
        logDebug(`Cleared TMDB cache for rating key ${ratingKey}`);
      }
    }

    return true;
  } catch (error) {
    logError("Failed to clear image cache:", error);
    return false;
  }
};

export default {
  testTautulliConnection,
  getImageUrl,
  getImageUrlSync,
  configureProxy,
  fetchRecentlyAdded,
  getMetadata,
  clearImageCache,
};
