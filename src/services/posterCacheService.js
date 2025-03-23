// Enhanced poster cache service with persistent in-memory cache
import { logError, logInfo, logDebug, logWarn } from "../utils/logger";
import axios from "axios";

// Create a persistent, application-lifetime poster URL cache
// This cache will survive component unmounts and tab switches
const GLOBAL_POSTER_CACHE = new Map();

// Also create a persistent pending requests tracker to prevent duplicate requests
const PENDING_REQUESTS = new Map();

/**
 * Enhanced poster cache service with persistent in-memory cache
 * This service manages poster URLs and caching to improve performance
 */

/**
 * Get cached poster URL from global cache first, then from server
 * @param {string} ratingKey - Media rating key
 * @returns {string|null} - Cached poster URL or null
 */
export const getCachedPosterUrl = (ratingKey) => {
  if (!ratingKey) return null;

  // Check our global in-memory cache first (fastest)
  if (GLOBAL_POSTER_CACHE.has(ratingKey)) {
    return GLOBAL_POSTER_CACHE.get(ratingKey);
  }

  // Generate server-side cached poster URL
  const posterUrl = `/api/posters/${ratingKey}?t=${Date.now()}`;

  // Store in global cache
  GLOBAL_POSTER_CACHE.set(ratingKey, posterUrl);

  return posterUrl;
};

/**
 * Force refresh the cached poster URL
 * @param {string} ratingKey - Media rating key
 * @returns {string} - New poster URL with cache-busting parameter
 */
export const refreshCachedPosterUrl = (ratingKey) => {
  if (!ratingKey) return null;

  // Generate a new URL with cache busting
  const refreshedUrl = `/api/posters/${ratingKey}?t=${Date.now()}`;

  // Update global cache
  GLOBAL_POSTER_CACHE.set(ratingKey, refreshedUrl);

  return refreshedUrl;
};

/**
 * Determine the appropriate thumb path based on media type
 * @param {Object} media - Media object
 * @returns {string|null} - Appropriate thumb path or null
 */
export const getAppropriateThumbPath = (media) => {
  if (!media) return null;

  // Get media type with fallback
  const mediaType = media.media_type?.toLowerCase() || "unknown";

  switch (mediaType) {
    case "movie":
      return media.thumb || null;
    case "show":
      return media.thumb || null;
    case "season":
      // For seasons, try parent or grandparent thumb first
      return (
        media.parent_thumb || media.grandparent_thumb || media.thumb || null
      );
    case "episode":
      // For episodes, grandparent (show) thumb is usually better
      return (
        media.grandparent_thumb || media.parent_thumb || media.thumb || null
      );
    case "artist":
      return media.thumb || null;
    case "album":
      return media.thumb || media.parent_thumb || null;
    case "track":
      return (
        media.grandparent_thumb || media.parent_thumb || media.thumb || null
      );
    default:
      return media.thumb || null;
  }
};

/**
 * Cache a poster with the server
 * @param {string} ratingKey - Media rating key
 * @param {string} thumbPath - Thumb path
 * @param {string} apiKey - API key
 * @param {string} mediaType - Media type
 * @returns {Promise<boolean>} - Success status
 */
export const cachePoster = async (ratingKey, thumbPath, apiKey, mediaType) => {
  if (!ratingKey || !thumbPath || !apiKey) {
    return false;
  }

  // Check if we're already caching this poster
  const pendingKey = `cache:${ratingKey}`;
  if (PENDING_REQUESTS.has(pendingKey)) {
    // A request is already in progress, return its promise
    return PENDING_REQUESTS.get(pendingKey);
  }

  // Create a promise for this request
  const requestPromise = new Promise(async (resolve) => {
    try {
      // Send request to cache the poster
      const response = await axios.post("/api/posters/cache", {
        ratingKey,
        thumbPath,
        apiKey,
        mediaType,
      });

      // If successful, update our global cache
      if (response.data.success) {
        // We don't need to update the URL here, as the server-side cache will handle it
        logDebug(`Cached poster for ${ratingKey}`);
        resolve(true);
      } else {
        logWarn(
          `Failed to cache poster for ${ratingKey}: ${response.data.error}`
        );
        resolve(false);
      }
    } catch (error) {
      logError(`Error caching poster for ${ratingKey}:`, error);
      resolve(false);
    } finally {
      // Remove from pending requests
      PENDING_REQUESTS.delete(pendingKey);
    }
  });

  // Store the promise in pending requests
  PENDING_REQUESTS.set(pendingKey, requestPromise);

  return requestPromise;
};

/**
 * Preload multiple posters in the background
 * @param {Array} mediaItems - Array of media items to preload posters for
 * @param {string} apiKey - API key
 * @returns {Promise<void>}
 */
export const preloadPosters = async (mediaItems, apiKey) => {
  if (!mediaItems || !mediaItems.length || !apiKey) return;

  // Track how many posters we're preloading for logging
  let preloadCount = 0;

  // Process in smaller batches to avoid overwhelming the server
  const BATCH_SIZE = 5;
  for (let i = 0; i < mediaItems.length; i += BATCH_SIZE) {
    const batch = mediaItems.slice(i, i + BATCH_SIZE);

    // Process this batch in parallel
    await Promise.allSettled(
      batch.map(async (item) => {
        try {
          if (!item.rating_key) return;

          // Skip if already in global cache
          if (GLOBAL_POSTER_CACHE.has(item.rating_key)) return;

          // Get appropriate thumb path
          const thumbPath = getAppropriateThumbPath(item);
          if (!thumbPath) return;

          // Request caching (don't wait for completion)
          cachePoster(item.rating_key, thumbPath, apiKey, item.media_type);
          preloadCount++;
        } catch (error) {
          // Ignore errors during preloading
        }
      })
    );

    // Small pause between batches
    if (i + BATCH_SIZE < mediaItems.length) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  if (preloadCount > 0) {
    logInfo(`Preloaded ${preloadCount} posters in the background`);
  }
};

/**
 * Get poster cache statistics from the server
 * @returns {Promise<Object>} - Cache statistics
 */
export const getPosterCacheStats = async () => {
  try {
    const response = await axios.get("/api/posters/cache/stats");
    return response.data;
  } catch (error) {
    logError("Failed to get poster cache stats:", error);
    throw error;
  }
};

/**
 * Clear the poster cache for a specific rating key
 * @param {string} ratingKey - Media rating key
 * @returns {Promise<boolean>} - Success status
 */
export const clearPosterCache = async (ratingKey) => {
  if (!ratingKey) return false;

  try {
    // Remove from global cache
    GLOBAL_POSTER_CACHE.delete(ratingKey);

    // Clear from server
    const response = await axios.post(`/api/posters/cache/clear/${ratingKey}`);
    return response.data.success;
  } catch (error) {
    logError(`Failed to clear poster cache for ${ratingKey}:`, error);
    return false;
  }
};

/**
 * Get the current size of the in-memory poster cache
 * @returns {number} - Number of cached poster URLs
 */
export const getInMemoryCacheSize = () => {
  return GLOBAL_POSTER_CACHE.size;
};

export default {
  getCachedPosterUrl,
  refreshCachedPosterUrl,
  getAppropriateThumbPath,
  cachePoster,
  preloadPosters,
  getPosterCacheStats,
  clearPosterCache,
  getInMemoryCacheSize,
};
