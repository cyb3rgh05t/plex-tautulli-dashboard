import React, { useState, useEffect, useRef, useCallback } from "react";
import { logError, logInfo, logDebug, logWarn } from "../../utils/logger";
import * as Icons from "lucide-react";
import MediaModal from "./MediaModal";
import axios from "axios";
import { useQueryClient } from "react-query";
import * as posterCacheService from "../../services/posterCacheService";

// Global cache for in-memory poster URLs to prevent flickering on tab changes
const posterUrlCache = new Map();

const MediaCard = ({ media }) => {
  // Safety check - if media is not valid, render nothing
  if (!media || typeof media !== "object") {
    return null;
  }

  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [resolution, setResolution] = useState(null);
  const [imageCacheKey, setImageCacheKey] = useState(Date.now());
  const [isRefreshingPoster, setIsRefreshingPoster] = useState(false);
  const [posterUrl, setPosterUrl] = useState("");
  const queryClient = useQueryClient();
  const posterUrlInitialized = useRef(false);
  const isMounted = useRef(true);

  // Create a unique cache key for this media item
  const cacheKey = `${media.rating_key || media.title}`;

  // Safely get media type
  const getMediaType = useCallback(() => {
    return media.media_type && typeof media.media_type === "string"
      ? media.media_type.toLowerCase()
      : "unknown";
  }, [media.media_type]);

  // Initialize poster URL on mount - with improved initialization flag
  useEffect(() => {
    // Set up cleanup
    isMounted.current = true;

    // Check if we already have this image in our cache
    if (posterUrlCache.has(cacheKey)) {
      const cachedUrl = posterUrlCache.get(cacheKey);
      setPosterUrl(cachedUrl);
      setImageLoading(false);
      posterUrlInitialized.current = true;
      return;
    }

    // Skip if we've already initialized the poster URL to avoid state changes during render
    if (posterUrlInitialized.current) return;

    // Mark as initialized
    posterUrlInitialized.current = true;

    // Use the cached poster URL from our service
    const posterPath = posterCacheService.getCachedPosterUrl(media.rating_key);

    if (posterPath) {
      setPosterUrl(posterPath);
      // Also update our in-memory cache
      posterUrlCache.set(cacheKey, posterPath);
      setImageLoading(false);
    } else {
      // If no cached poster, try to get thumb path and cache it
      const thumbPath = posterCacheService.getAppropriateThumbPath(media);

      if (thumbPath && media.apiKey) {
        // Set temporary URL to Tautulli proxy while we cache it
        const tempUrl = `/api/tautulli/pms_image_proxy?img=${encodeURIComponent(
          thumbPath
        )}&apikey=${media.apiKey}&_t=${imageCacheKey}`;

        setPosterUrl(tempUrl);

        // Also request server to cache this poster for next time
        posterCacheService
          .cachePoster(
            media.rating_key,
            thumbPath,
            media.apiKey,
            getMediaType()
          )
          .then((success) => {
            if (success && isMounted.current) {
              // Update with the cached URL
              const cachedUrl = posterCacheService.getCachedPosterUrl(
                media.rating_key
              );
              setPosterUrl(cachedUrl);
              posterUrlCache.set(cacheKey, cachedUrl);
            }
          })
          .catch((error) => {
            logWarn(
              `Failed to cache poster for ${media.title || "unknown"}:`,
              error
            );
          });
      } else {
        // No valid poster source
        setImageError(true);
      }
    }

    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [media, getMediaType, cacheKey, media.apiKey, imageCacheKey]);

  // Function to create minimal metadata for caching
  const createMinimalMetadata = (metadata) => {
    // Only store essential fields to keep cache size small
    return {
      rating_key: metadata.rating_key,
      media_type: metadata.media_type,
      parent_media_index: metadata.parent_media_index,
      media_index: metadata.media_index,
      year: metadata.year,
      title: metadata.title,
      original_title: metadata.original_title,
      content_rating: metadata.content_rating || metadata.contentRating,
      rating: metadata.rating,
      video_full_resolution: metadata.video_full_resolution,
      thumb: metadata.thumb,
      parent_thumb: metadata.parent_thumb,
      grandparent_thumb: metadata.grandparent_thumb,
      // Don't include large properties like summary, full metadata, etc.
    };
  };

  // Function to refresh just this poster
  const refreshPoster = async (e) => {
    if (e) {
      e.stopPropagation(); // Prevent triggering the card click event
    }

    setIsRefreshingPoster(true);

    try {
      // Force browser to reload image by changing cache key
      const newCacheKey = Date.now();
      setImageCacheKey(newCacheKey);

      // Reset image state
      setImageError(false);
      setImageLoading(true);

      // Get metadata to find thumb path
      let thumbPath = null;

      try {
        // First check if we can get it from current data
        thumbPath = posterCacheService.getAppropriateThumbPath(media);

        if (!thumbPath) {
          // If not, fetch metadata from API
          const response = await axios.get(`/api/tautulli/api/v2`, {
            params: {
              apikey: media.apiKey,
              cmd: "get_metadata",
              rating_key: media.rating_key,
            },
          });

          if (response.data?.response?.result === "success") {
            const metadata = response.data.response.data;

            // Update the cached metadata
            queryClient.setQueryData(
              [`media:${media.rating_key}`],
              createMinimalMetadata(metadata)
            );

            // Get appropriate thumb path
            thumbPath = posterCacheService.getAppropriateThumbPath(metadata);
          }
        }
      } catch (metadataError) {
        logError(`Error fetching metadata for poster refresh:`, metadataError);
      }

      if (thumbPath && media.apiKey) {
        // Clear existing cache
        await axios.post(`/api/posters/cache/clear/${media.rating_key}`);

        // Cache new poster
        await posterCacheService.cachePoster(
          media.rating_key,
          thumbPath,
          media.apiKey,
          getMediaType()
        );

        // Get new cached URL
        const newPosterUrl = posterCacheService.getCachedPosterUrl(
          media.rating_key
        );
        setPosterUrl(newPosterUrl);
        posterUrlCache.set(cacheKey, newPosterUrl);

        logInfo(`Refreshed poster for ${media.title || "media item"}`);
      } else {
        // Fallback to Tautulli proxy if cache fails
        const mediaType = getMediaType();

        // Get appropriate thumb path based on media type
        switch (mediaType) {
          case "movie":
            thumbPath = media.thumb || media.parent_thumb;
            break;
          case "show":
            thumbPath = media.thumb || media.parent_thumb;
            break;
          case "episode":
            thumbPath = media.grandparent_thumb || media.thumb;
            break;
          case "season":
            thumbPath = media.grandparent_thumb || media.thumb;
            break;
          default:
            thumbPath =
              media.thumb || media.parent_thumb || media.grandparent_thumb;
        }

        if (thumbPath && media.apiKey) {
          const fallbackUrl = `/api/tautulli/pms_image_proxy?img=${encodeURIComponent(
            thumbPath
          )}&apikey=${media.apiKey}&_t=${newCacheKey}`;

          setPosterUrl(fallbackUrl);
          setImageLoading(false);
        } else {
          setImageError(true);
        }
      }
    } catch (error) {
      logError("Failed to refresh poster", error);
      setImageError(true);
    } finally {
      // After a short delay, turn off the refreshing indicator
      setTimeout(() => {
        setIsRefreshingPoster(false);
      }, 500);
    }
  };

  // Check resolution from metadata if not already loaded
  useEffect(() => {
    if (resolution || !media || !media.rating_key || !media.apiKey) return;

    if (media.video_full_resolution) {
      setResolution(media.video_full_resolution);
      return;
    }

    // Check if we have cached metadata with resolution
    const cachedItem = queryClient.getQueryData([`media:${media.rating_key}`]);
    if (cachedItem?.video_full_resolution) {
      setResolution(cachedItem.video_full_resolution);
      return;
    }

    // If not already fetching metadata for resolution
    if (!media.guids && !media.grandparent_guids) {
      const controller = new AbortController();
      let isComponentMounted = true;

      // Add a small random delay to spread out API calls
      const timeoutId = setTimeout(async () => {
        try {
          const response = await axios.get(`/api/tautulli/api/v2`, {
            params: {
              apikey: media.apiKey,
              cmd: "get_metadata",
              rating_key: media.rating_key,
            },
            signal: controller.signal,
          });

          if (!isComponentMounted) return;

          const mediaInfo = response.data?.response?.data?.media_info?.[0];
          if (mediaInfo) {
            let videoResolution = mediaInfo.video_full_resolution;
            // Convert 4K to 2160p for consistent display
            if (videoResolution === "4k") {
              videoResolution = "2160p";
            }
            setResolution(videoResolution);
          }
        } catch (error) {
          if (!axios.isCancel(error)) {
            logError("Failed to fetch resolution:", error);
          }
        }
      }, Math.random() * 2000); // Random delay up to 2 seconds

      return () => {
        isComponentMounted = false;
        controller.abort();
        clearTimeout(timeoutId);
      };
    }
  }, [
    media?.rating_key,
    media?.apiKey,
    resolution,
    queryClient,
    media?.video_full_resolution,
    media?.guids,
    media?.grandparent_guids,
  ]);

  // Get values for display
  const displayTitle = getDisplayTitle();
  const displaySubtitle = getDisplaySubtitle();
  const relativeAddedTime = getRelativeAddedTime(media.added_at);

  // Get display title based on media type
  function getDisplayTitle() {
    // Safety check for media object
    if (!media) return "Unknown";

    const mediaType = getMediaType();

    switch (mediaType) {
      case "movie":
        return media.title || "Unknown Movie";
      case "episode":
        return media.grandparent_title || "Unknown Show";
      case "season":
        return media.grandparent_title || "Unknown Show";
      case "show":
        return media.title || "Unknown Show";
      case "artist":
        return media.title || "Unknown Artist";
      case "album":
        return media.parent_title || media.title || "Unknown Album";
      case "track":
        return media.grandparent_title || media.title || "Unknown Track";
      default:
        return media.title || "Unknown";
    }
  }

  // Get display subtitle based on media type
  function getDisplaySubtitle() {
    // Safety check for media object
    if (!media) return "";

    const mediaType = getMediaType();

    switch (mediaType) {
      case "movie":
        return media.year || "";
      case "episode":
        return `S${String(media.parent_media_index || "0").padStart(
          2,
          "0"
        )}・E${String(media.media_index || "0").padStart(2, "0")}`;
      case "season":
        return `Season ${media.media_index || 1}`;
      case "show":
        return `Season ${media.season || 1}`;
      case "artist":
        return "Artist";
      case "album":
        return media.year || "Album";
      case "track":
        return media.parent_title || "Track";
      default:
        return "";
    }
  }

  // Date formatting helper for relative added time
  function getRelativeAddedTime(timestamp) {
    if (!timestamp) return "Recently";

    // Convert timestamp to milliseconds if needed
    const timestampMs =
      String(timestamp).length === 10 ? timestamp * 1000 : timestamp;

    const now = new Date();
    const addedDate = new Date(timestampMs);
    const diffMs = now - addedDate;

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  }

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="group cursor-pointer space-y-2"
      >
        <div
          className="relative aspect-[2/3] rounded-xl overflow-hidden 
            bg-gray-800/50 border border-accent 
            group-hover:border-accent-hover group-hover:shadow-accent
            transition-theme"
        >
          {/* Loading State */}
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-modal backdrop-blur-sm">
              <div className="animate-spin mr-2">
                <Icons.Loader2 className="h-8 w-8 text-accent" />
              </div>
            </div>
          )}

          {/* Image */}
          {!imageError && posterUrl ? (
            <>
              {/* Add refresh button in top-left corner */}
              <button
                aria-label="Refresh poster"
                onClick={(e) => refreshPoster(e)}
                className={`absolute top-2 left-2 p-1 rounded-full z-10
                  bg-black/50 backdrop-blur-sm border border-gray-700/50
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200
                  hover:bg-accent-light/50 hover:border-accent/50`}
              >
                <Icons.RefreshCw
                  size={14}
                  className={`text-white ${
                    isRefreshingPoster ? "animate-spin" : ""
                  }`}
                />
              </button>

              <img
                src={posterUrl}
                alt={media.title || "Media"}
                className={`w-full h-full object-cover transition-all duration-300 
                    group-hover:scale-105 ${
                      imageLoading ? "opacity-0" : "opacity-100"
                    }`}
                loading="lazy"
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);

                  // If poster fails to load, try refreshing it
                  refreshPoster();
                }}
              />

              {/* Overlay - only show if we have a valid image */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2 text-sm text-white">
                    <Icons.Info size={16} />
                    <span>View Details</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/50">
              <Icons.Film size={32} className="text-gray-500 mb-2" />
              <span className="text-theme-muted text-sm mb-3">No Preview</span>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent the card click event
                  refreshPoster(e);
                }}
                className="px-3 py-1.5 bg-accent-lighter rounded-lg 
                  border border-accent/20 text-accent text-xs font-medium 
                  hover:bg-accent-light transition-theme flex items-center gap-1.5"
              >
                <Icons.RefreshCw
                  size={14}
                  className={`text-accent ${
                    isRefreshingPoster ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </button>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {/* Added Time Badge */}
            <div
              className="px-2 py-1 bg-gray-900/70 backdrop-blur-sm rounded-lg 
                border border-accent text-theme-muted text-xs font-medium 
                flex items-center gap-1"
            >
              <Icons.Clock3 size={12} />
              {relativeAddedTime}
            </div>

            {/* Resolution Badge
            {resolution && (
              <div
                className="px-2 py-1 bg-gray-900/70 backdrop-blur-sm rounded-lg 
                  border border-accent/20 text-accent text-xs font-medium"
              >
                {resolution}
              </div>
            )}
            */}

            {media.rating && (
              <div
                className="px-2 py-1 bg-yellow-500/20 backdrop-blur-sm rounded-lg 
                  border border-yellow-500/20 text-yellow-400 text-xs font-medium 
                  flex items-center gap-1"
              >
                <Icons.Star size={12} />
                {media.rating}
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-1 px-1">
          <h3 className="text-white font-medium truncate">{displayTitle}</h3>
          <div className="flex items-center gap-2 text-sm">
            {displaySubtitle && (
              <span className="text-accent">{displaySubtitle}</span>
            )}
            {media.duration && (
              <div className="flex items-center gap-1 text-gray-400">
                <Icons.Clock3 size={14} />
                <span>{Math.round((media.duration || 0) / 60000)}m</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal is rendered through a portal */}
      {showModal && (
        <MediaModal
          media={media}
          onClose={() => setShowModal(false)}
          apiKey={media.apiKey}
        />
      )}
    </>
  );
};

export default MediaCard;
