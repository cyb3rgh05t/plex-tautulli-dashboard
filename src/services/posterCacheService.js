// src/services/posterCacheService.js
import axios from "axios";
import { logError, logInfo, logDebug, logWarn } from "../utils/logger";

/**
 * Get cached poster URL for a rating key
 * @param {String} ratingKey - Unique identifier for the media item
 * @returns {String|null} - Cached poster URL or null if not found
 */
export const getCachedPosterUrl = (ratingKey) => {
  if (!ratingKey) return null;

  try {
    // Generate cached poster URL with cache buster to ensure fresh retrieval
    return `/api/posters/${ratingKey}?t=${Date.now()}`;
  } catch (error) {
    logError("Error retrieving cached poster URL:", error);
    return null;
  }
};

/**
 * Request the server to download and cache a poster
 * @param {String} ratingKey - Rating key of the media item
 * @param {String} thumbPath - Path to the thumbnail
 * @param {String} apiKey - Tautulli API key
 * @param {String} mediaType - Type of media (movie, show, episode, etc.)
 * @returns {Promise<Boolean>} - Success status
 */
export const cachePoster = async (
  ratingKey,
  thumbPath,
  apiKey,
  mediaType = ""
) => {
  if (!ratingKey || !thumbPath || !apiKey) return false;

  try {
    const response = await axios.post("/api/posters/cache", {
      ratingKey,
      thumbPath,
      apiKey,
      mediaType,
    });

    if (response.data && response.data.success) {
      logDebug(`Cached poster for ${ratingKey}`);
      return true;
    }

    return false;
  } catch (error) {
    logError(`Error caching poster for ${ratingKey}:`, error);
    return false;
  }
};

/**
 * Get appropriate thumb path based on media type, especially for episodes
 * @param {Object} mediaItem - Media item object
 * @returns {String|null} - Appropriate thumb path
 */
export const getAppropriateThumbPath = (mediaItem) => {
  if (!mediaItem) return null;

  const mediaType = (mediaItem.media_type || "").toLowerCase();

  // For episodes, use grandparent_thumb (show poster) or parent_thumb (season poster)
  if (mediaType === "episode") {
    return mediaItem.grandparent_thumb || mediaItem.parent_thumb;
  }

  // For seasons, use grandparent_thumb (show poster)
  if (mediaType === "season") {
    return (
      mediaItem.grandparent_thumb || mediaItem.parent_thumb || mediaItem.thumb
    );
  }

  // For other media types
  switch (mediaType) {
    case "movie":
      return mediaItem.thumb || mediaItem.parent_thumb;
    case "show":
      return mediaItem.thumb || mediaItem.parent_thumb;
    case "artist":
      return mediaItem.thumb;
    case "album":
      return mediaItem.thumb || mediaItem.parent_thumb;
    case "track":
      return (
        mediaItem.grandparent_thumb || mediaItem.parent_thumb || mediaItem.thumb
      );
    default:
      return (
        mediaItem.thumb || mediaItem.parent_thumb || mediaItem.grandparent_thumb
      );
  }
};

/**
 * Get poster URL for a media item - checks cache first, then requests caching if not found
 * @param {Object} mediaItem - Media item with rating_key and thumb
 * @param {String} apiKey - Tautulli API key
 * @returns {Promise<String|null>} - URL to poster or null if not available
 */
export const getPosterUrl = async (mediaItem, apiKey) => {
  if (!mediaItem || !mediaItem.rating_key) return null;

  const ratingKey = mediaItem.rating_key;

  // First check if we have it in cache - use synchronous method to get URL immediately
  const cachedUrl = getCachedPosterUrl(ratingKey);

  // Request the server to cache it if thumb path is available
  if (
    mediaItem.thumb ||
    mediaItem.grandparent_thumb ||
    mediaItem.parent_thumb
  ) {
    // Get appropriate thumb path based on media type
    const thumbPath = getAppropriateThumbPath(mediaItem);

    if (thumbPath) {
      // Request caching (this is async, but we return the URL immediately)
      cachePoster(
        ratingKey,
        thumbPath,
        apiKey,
        mediaItem.media_type || ""
      ).catch((err) => {
        logWarn(`Background caching failed for ${ratingKey}:`, err);
      });
    }
  }

  return cachedUrl;
};

/**
 * Prefetch posters for multiple media items
 * @param {Array} mediaItems - Array of media items
 * @param {String} apiKey - Tautulli API key
 * @returns {Promise<Object>} - Result stats
 */
export const prefetchPosters = async (mediaItems, apiKey) => {
  if (!mediaItems || !mediaItems.length || !apiKey) {
    return { total: 0, success: 0, failed: 0 };
  }

  logInfo(`Prefetching ${mediaItems.length} posters...`);

  let success = 0;
  let failed = 0;

  // Process in batches to avoid overwhelming the server
  const BATCH_SIZE = 5;
  const batches = [];

  for (let i = 0; i < mediaItems.length; i += BATCH_SIZE) {
    batches.push(mediaItems.slice(i, i + BATCH_SIZE));
  }

  // Process each batch sequentially
  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map((item) => {
        const thumbPath = getAppropriateThumbPath(item);
        if (!thumbPath)
          return Promise.reject(new Error("No thumb path available"));

        return cachePoster(
          item.rating_key,
          thumbPath,
          apiKey,
          item.media_type || ""
        );
      })
    );

    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        success++;
      } else {
        failed++;
      }
    });

    // Small delay between batches to prevent overwhelming the server
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  logInfo(`Poster prefetch complete: ${success} succeeded, ${failed} failed`);

  return { total: mediaItems.length, success, failed };
};

/**
 * Clear poster cache
 * @returns {Promise<Boolean>} - Success status
 */
export const clearPosterCache = async () => {
  try {
    const response = await axios.post("/api/posters/cache/clear");

    if (response.data && response.data.success) {
      logInfo("Poster cache cleared");
      return true;
    }

    return false;
  } catch (error) {
    logError("Error clearing poster cache:", error);
    return false;
  }
};

/**
 * Get poster cache stats
 * @returns {Promise<Object>} - Cache stats
 */
export const getPosterCacheStats = async () => {
  try {
    const response = await axios.get("/api/posters/cache/stats");

    if (response.data) {
      return response.data;
    }

    return { count: 0, size: 0 };
  } catch (error) {
    logError("Error getting poster cache stats:", error);
    return { count: 0, size: 0, error: error.message };
  }
};

export default {
  getCachedPosterUrl,
  cachePoster,
  getPosterUrl,
  prefetchPosters,
  clearPosterCache,
  getPosterCacheStats,
  getAppropriateThumbPath,
};
