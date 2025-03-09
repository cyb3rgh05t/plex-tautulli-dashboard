import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useConfig } from "../../context/ConfigContext";
import { logError, logInfo, logDebug, logWarn } from "../../utils/logger";
import * as Icons from "lucide-react";
import MediaModal from "./MediaModal";
import ThemedButton from "../common/ThemedButton";
import ThemedCard from "../common/ThemedCard";
import { useTheme } from "../../context/ThemeContext.jsx";
import axios from "axios";
import ThemedTabButton from "../common/ThemedTabButton";
import { useQuery, useQueryClient, useQueries } from "react-query";
import toast from "react-hot-toast";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

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

  // Safely get media type
  const getMediaType = () => {
    return media.media_type && typeof media.media_type === "string"
      ? media.media_type.toLowerCase()
      : "unknown";
  };

  // Get thumbnail based on media type
  const getThumbnailUrl = () => {
    // Safety check for media object
    if (!media || !media.apiKey) {
      logWarn("Media item missing API key:", media?.title || "unknown");
      return "";
    }

    let thumbPath;
    const mediaType = getMediaType();

    // Enhanced thumbnail logic to handle more cases
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
      case "artist":
        thumbPath = media.thumb;
        break;
      case "album":
        thumbPath = media.thumb || media.parent_thumb;
        break;
      case "track":
        thumbPath =
          media.grandparent_thumb || media.parent_thumb || media.thumb;
        break;
      default:
        thumbPath =
          media.thumb || media.parent_thumb || media.grandparent_thumb;
    }

    if (!thumbPath) {
      return "";
    }

    // Use pms_image_proxy endpoint for reliability
    return `/api/tautulli/pms_image_proxy?img=${encodeURIComponent(
      thumbPath
    )}&apikey=${media.apiKey}&_t=${imageCacheKey}`;
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

      // If the image is in the metadata cache on the server, refresh it
      if (media.rating_key) {
        await axios.post(`/api/refresh-posters`, {
          mediaId: media.rating_key,
        });

        // Also request a clear cache from the API
        await axios.get("/api/clear-image-cache", {
          params: {
            source: `media-${media.rating_key}`,
            t: newCacheKey,
          },
        });
      }

      // Force browser to discard image with this trick
      const img = new Image();
      img.src = getThumbnailUrl() + "&forceRefresh=true&" + newCacheKey;

      // Log the refresh
      logInfo(`Refreshed poster for ${media.title || "media item"}`);
    } catch (error) {
      logError("Failed to refresh poster", error);
    } finally {
      // After a short delay, turn off the refreshing indicator
      setTimeout(() => {
        setIsRefreshingPoster(false);
      }, 500);
    }
  };

  // Generate the image URL once
  const imageUrl = getThumbnailUrl();

  const getDisplayTitle = () => {
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
  };

  const getDisplaySubtitle = () => {
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
  };

  // Date formatting helper for relative added time
  const getRelativeAddedTime = (timestamp) => {
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
  };

  // Fetch resolution metadata
  useEffect(() => {
    if (!media || !media.rating_key || !media.apiKey) return;

    const controller = new AbortController();
    let isMounted = true;

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

        if (!isMounted) return;

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
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [media?.rating_key, media?.apiKey]);

  // Check if image is cached in browser
  useEffect(() => {
    if (!imageUrl) {
      setImageLoading(false);
      setImageError(true);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImageLoading(false);
    };
    img.onerror = () => {
      setImageError(true);
      setImageLoading(false);
    };
    img.src = imageUrl;

    // Image is already cached in browser
    if (img.complete) {
      setImageLoading(false);
    }

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  // Get values for display
  const displayTitle = getDisplayTitle();
  const displaySubtitle = getDisplaySubtitle();
  const relativeAddedTime = getRelativeAddedTime(media.added_at);

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
          {/* Add refresh button in top-left corner */}
          <button
            aria-label="Refresh poster"
            onClick={refreshPoster}
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

          {/* Loading State */}
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-modal backdrop-blur-sm">
              <div className="animate-spin mr-2">
                <Icons.Loader2 className="h-8 w-8 text-accent" />
              </div>
            </div>
          )}

          {/* Image */}
          {!imageError && imageUrl ? (
            <img
              src={imageUrl}
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
              }}
            />
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

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center gap-2 text-sm text-white">
                <Icons.Play size={16} />
                <span>View Details</span>
              </div>
            </div>
          </div>

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

            {/* Resolution Badge */}
            {resolution && (
              <div
                className="px-2 py-1 bg-gray-900/70 backdrop-blur-sm rounded-lg 
                  border border-accent/20 text-accent text-xs font-medium"
              >
                {resolution}
              </div>
            )}

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
          <h3 className="text-white font-medium truncate">
            {getDisplayTitle()}
          </h3>
          <div className="flex items-center gap-2 text-sm">
            {getDisplaySubtitle() && (
              <span className="text-accent">{getDisplaySubtitle()}</span>
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

      {/* Modal is now rendered through a portal */}
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

const LoadingCard = () => (
  <div className="space-y-3">
    {/* Card image skeleton */}
    <div className="aspect-[2/3] rounded-xl overflow-hidden relative border border-accent bg-gray-800/50">
      {/* Pulsing overlay */}
      <div className="absolute inset-0 bg-gray-700/50 animate-pulse"></div>

      {/* Add subtle accent color glow */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1">
        <div className="h-5 w-16 bg-accent/20 rounded-lg animate-pulse"></div>
        <div className="h-5 w-12 bg-accent/20 rounded-lg animate-pulse"></div>
      </div>
    </div>

    {/* Title skeleton */}
    <div className="h-4 bg-gray-800 rounded w-4/5 animate-pulse"></div>

    {/* Metadata skeletons */}
    <div className="flex items-center gap-2">
      <div className="h-3 bg-accent/30 rounded w-1/3 animate-pulse"></div>
      <div className="h-3 bg-gray-800 rounded w-1/4 animate-pulse"></div>
    </div>
  </div>
);

const EmptySection = ({ type }) => {
  // Add safety check for type
  const getSafeType = () => {
    return type && typeof type === "string" ? type.toLowerCase() : "unknown";
  };

  const getEmptyMessage = () => {
    // Use our safe type getter
    const safeType = getSafeType();

    switch (safeType) {
      case "movie":
        return {
          icon: Icons.Film,
          message: "No movies have been added recently",
          hint: "New movies will appear here when they are added to your library.",
        };
      case "show":
        return {
          icon: Icons.Tv,
          message: "No TV shows have been added recently",
          hint: "New episodes and shows will appear here when they are added.",
        };
      case "artist":
        return {
          icon: Icons.Music,
          message: "No music has been added recently",
          hint: "New albums and tracks will appear here when they are added.",
        };
      default:
        return {
          icon: Icons.Library,
          message: "No media has been added recently",
          hint: "New content will appear here when it is added to your library.",
        };
    }
  };

  const { icon: Icon, message, hint } = getEmptyMessage();

  return (
    <ThemedCard className="p-8 text-center flex flex-col items-center">
      <div className="flex justify-center mb-4">
        <Icon size={32} className="text-accent opacity-70" />
      </div>
      <p className="text-theme-muted font-medium mb-1">{message}</p>
      <p className="text-sm text-theme-muted">{hint}</p>
    </ThemedCard>
  );
};

// Updated NoLibrariesCard component with centered layout
const NoLibrariesCard = ({ type }) => {
  const typeIcons = {
    movies: Icons.Film,
    shows: Icons.Tv,
    music: Icons.Music,
  };

  const typeDescriptions = {
    movies: "movie libraries",
    shows: "TV show libraries",
    music: "music libraries",
  };

  const Icon = typeIcons[type] || Icons.Library;
  const description = typeDescriptions[type] || "media libraries";

  return (
    <ThemedCard
      className="flex items-center justify-center min-h-[300px]"
      useAccentBorder={true}
    >
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Icon size={48} className="text-accent opacity-70" />
        </div>
        <h3 className="text-white text-xl font-semibold mb-2">
          No {description} have been saved yet
        </h3>
        <p className="text-theme-muted text-sm max-w-md mx-auto mb-6">
          Visit the Libraries tab to add and configure your {description}.
          Select the libraries you want to display in the Recently Added
          section.
        </p>
        <ThemedButton
          onClick={() => {
            // Multiple navigation methods
            window.dispatchEvent(new CustomEvent("navigateToLibraries"));

            // Fallback navigation methods
            if (
              window.routerNavigate &&
              typeof window.routerNavigate === "function"
            ) {
              window.routerNavigate("/#/libraries");
            } else if (window.location) {
              window.location.href = "/#/libraries";
            }
          }}
          variant="accent"
          icon={Icons.Library}
        >
          Go to Libraries
        </ThemedButton>
      </div>
    </ThemedCard>
  );
};

// Helper for standardizing section types
const mapSectionType = (section) => {
  if (!section) return "unknown";

  // Get potential type properties
  const rawType =
    section.type || section.section_type || section.library_type || "unknown";

  // Normalize to standard types
  const typeStr = String(rawType).toLowerCase();

  // Map to standard type names
  if (typeStr.includes("movie")) return "movie";
  if (typeStr.includes("show")) return "show";
  if (typeStr.includes("artist") || typeStr.includes("music")) return "artist";

  return typeStr;
};

// Enhanced RecentlyAdded component with optimized loading
const RecentlyAdded = () => {
  const { config } = useConfig();
  const queryClient = useQueryClient();
  const [activeMediaTypeFilter, setActiveMediaTypeFilter] = useState("all");
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const REFRESH_INTERVAL = 600000; // 10 minutes in milliseconds
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  // NEW: Track if we've already loaded data at least once
  const initialLoadCompleted = useRef(false);

  // NEW: Use central loading state instead of component loading
  const [isComponentLoading, setIsComponentLoading] = useState(true);

  // IMPROVED: Sections query with better caching configuration
  const {
    data: sectionsData,
    isLoading: isSectionsLoading,
    error: sectionsError,
  } = useQuery(
    ["sections"],
    async () => {
      logInfo("Fetching sections data");
      const response = await fetch(`/api/sections`);
      if (!response.ok) throw new Error("Failed to load sections");
      return response.json();
    },
    {
      staleTime: 30 * 60 * 1000, // Consider data fresh for 30 minutes
      cacheTime: 60 * 60 * 1000, // Keep in cache for 1 hour
      refetchOnWindowFocus: false,
      refetchOnMount: !initialLoadCompleted.current, // Only refetch on first mount
      onError: (err) => setError("Failed to load sections: " + err.message),
      onSuccess: () => {
        // Mark initial load as completed when sections data is successfully loaded
        initialLoadCompleted.current = true;
      },
    }
  );

  // Process sections from the cached data
  const processedSections = useMemo(() => {
    if (!sectionsData || !sectionsData.sections) return [];

    return sectionsData.sections.map((section) => {
      const sectionData = section.raw_data || section;
      return {
        ...sectionData,
        type: mapSectionType(sectionData), // Use standardized type mapping
        name: sectionData.name || sectionData.section_name || "Unknown Section",
      };
    });
  }, [sectionsData]);

  // Get all unique section IDs
  const allSectionIds = useMemo(() => {
    return processedSections
      .map((section) => section.section_id)
      .filter(Boolean);
  }, [processedSections]);

  // Instead of using media type queries, fetch each section directly
  const sectionQueries = useQueries(
    allSectionIds.map((sectionId) => ({
      queryKey: [`section:${sectionId}`],
      queryFn: async () => {
        // Skip if no config available yet
        if (!config?.tautulliApiKey) return { media: [], section: null };

        try {
          // Direct API call to get recently added for this specific section
          // IMPORTANT: Strictly requesting exactly 6 items
          const response = await axios.get(`/api/tautulli/api/v2`, {
            params: {
              apikey: config.tautulliApiKey,
              cmd: "get_recently_added",
              section_id: sectionId,
              count: 6, // STRICTLY 6 items per section
            },
          });

          if (response.data?.response?.result !== "success") {
            throw new Error(`Error fetching section ${sectionId}`);
          }

          // Get section info
          const section = processedSections.find(
            (s) => s.section_id === sectionId
          );

          // Process each media item to ensure it has API key
          const mediaItems = (
            response.data?.response?.data?.recently_added || []
          ).map((item) => ({
            ...item,
            apiKey: config.tautulliApiKey, // Ensure API key is set for image loading
            section_id: sectionId,
            section_type: section?.type || "unknown",
          }));

          // IMPORTANT: Ensure we only return exactly 6 items
          return {
            media: mediaItems.slice(0, 6),
            section,
          };
        } catch (error) {
          logError(`Error loading section ${sectionId}:`, error);
          return { media: [], section: null };
        }
      },
      staleTime: 5 * 60 * 1000, // 5 minute stale time
      cacheTime: 15 * 60 * 1000, // 15 minute cache time
      enabled:
        !!config?.tautulliApiKey &&
        !isSectionsLoading &&
        !!allSectionIds.length,
      refetchOnWindowFocus: false,
      onError: (err) => logError(`Error fetching section ${sectionId}:`, err),
    }))
  );

  // Wait for all sections to load before showing content
  useEffect(() => {
    // Check if all section queries are done (success or error)
    const allQueriesDone = sectionQueries.every((query) => !query.isLoading);

    // Set loading state based on section queries and sections data
    if (!isSectionsLoading && allQueriesDone) {
      setIsComponentLoading(false);
    } else {
      setIsComponentLoading(true);
    }
  }, [sectionQueries, isSectionsLoading]);

  // Process section data based on the active filter
  const filteredSections = useMemo(() => {
    // Get only successful queries
    const successfulQueries = sectionQueries.filter(
      (query) =>
        query.isSuccess && query.data?.media?.length > 0 && query.data?.section
    );

    // Group by section
    return successfulQueries
      .map((query) => query.data)
      .filter((data) => {
        // For 'all' filter, include all sections
        if (activeMediaTypeFilter === "all") return true;

        // Otherwise filter by media type
        const sectionType = mapSectionType(data.section);
        const typeMap = {
          movies: "movie",
          shows: "show",
          music: "artist",
        };

        return sectionType === typeMap[activeMediaTypeFilter];
      });
  }, [sectionQueries, activeMediaTypeFilter]);

  // Handler for new media detection and automatic update
  useEffect(() => {
    // Set up a check for new media every minute
    const newMediaCheckInterval = setInterval(async () => {
      if (!config?.tautulliApiKey || allSectionIds.length === 0) return;

      try {
        // Check if there's any new activity in the last 5 minutes
        const response = await axios.get(`/api/tautulli/api/v2`, {
          params: {
            apikey: config.tautulliApiKey,
            cmd: "get_recently_added",
            count: 1,
          },
        });

        if (response.data?.response?.result !== "success") return;

        const latestItem = response.data?.response?.data?.recently_added?.[0];
        if (!latestItem) return;

        // Check if this item was added in the last 5 minutes
        const addedAt = latestItem.added_at;
        const now = Math.floor(Date.now() / 1000);
        const fiveMinutesAgo = now - 5 * 60;

        if (addedAt && addedAt > fiveMinutesAgo) {
          // New media detected! Refresh all sections
          logInfo("New media detected, refreshing all sections");
          toast.success("New media detected! Refreshing...");

          // Invalidate all section queries
          await queryClient.invalidateQueries(["sections"]);
          for (const sectionId of allSectionIds) {
            await queryClient.invalidateQueries([`section:${sectionId}`]);
          }

          // Update refresh time
          setLastRefreshTime(Date.now());
        }
      } catch (error) {
        // Silent failure - just log the error but don't show to user
        logError("Error checking for new media:", error);
      }
    }, 60000); // Check every minute

    return () => clearInterval(newMediaCheckInterval);
  }, [config?.tautulliApiKey, allSectionIds, queryClient]);

  // Log state to aid debugging
  useEffect(() => {
    if (filteredSections.length > 0) {
      logDebug(`Displaying ${filteredSections.length} sections with media`);

      // Print them out
      filteredSections.forEach((section) => {
        logDebug(
          `Section: ${section.section?.name || "Unknown"}, Items: ${
            section.media.length
          }`
        );
      });
    }
  }, [filteredSections]);

  // Track if any queries are still loading
  const isLoading =
    sectionQueries.some((query) => query.isLoading) ||
    isSectionsLoading ||
    isComponentLoading;

  // Determine if we have any data
  const hasAnyData = filteredSections.length > 0;

  // Handle refresh button click - force refresh all data
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setError(null);

    try {
      // Notify user
      toast.success("Refreshing media content...");

      // Clear image cache
      await axios.get("/api/clear-image-cache");

      // Invalidate all queries
      await queryClient.invalidateQueries(["sections"]);

      // Invalidate section queries
      for (const sectionId of allSectionIds) {
        await queryClient.invalidateQueries([`section:${sectionId}`]);
      }

      // Update refresh time
      setLastRefreshTime(Date.now());

      // Success notification
      toast.success("Media content refreshed!");
    } catch (error) {
      logError("Failed to refresh media", error);
      setError("Failed to refresh media");
      toast.error("Failed to refresh media");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Effect for handling route changes and auto-refresh
  useEffect(() => {
    // Check if we're navigating TO the recent tab
    if (location.pathname === "/recent" && prevPathRef.current !== "/recent") {
      logInfo("Navigated to recently added tab, checking cache freshness");

      // Only trigger loading state if data is stale or missing
      const needsRefresh = sectionQueries.some(
        (query) => query.isStale || !query.data?.media?.length
      );

      if (needsRefresh) {
        setIsComponentLoading(true);

        // Silently refresh data in background
        setTimeout(() => {
          // Force refetch sections
          queryClient.invalidateQueries(["sections"]);

          // Invalidate all section queries
          for (const sectionId of allSectionIds) {
            queryClient.invalidateQueries([`section:${sectionId}`]);
          }

          // Allow a little time for new data to load
          setTimeout(() => {
            setIsComponentLoading(false);
          }, 800);
        }, 100);
      }
    }

    // Update ref for next comparison
    prevPathRef.current = location.pathname;

    // Set up auto-refresh interval
    const refreshInterval = setInterval(() => {
      if (Date.now() - lastRefreshTime > REFRESH_INTERVAL) {
        logInfo("Auto-refreshing recently added data");
        // Silently refresh in background
        for (const sectionId of allSectionIds) {
          queryClient.invalidateQueries([`section:${sectionId}`]);
        }
        setLastRefreshTime(Date.now());
      }
    }, 60000); // Check every minute

    return () => clearInterval(refreshInterval);
  }, [location.pathname, queryClient, lastRefreshTime, allSectionIds]);

  // Listen for image cache cleared events
  useEffect(() => {
    const handleImageCacheCleared = () => {
      logInfo("Image cache cleared event received, refreshing data");
      // Force refresh all section queries
      for (const sectionId of allSectionIds) {
        queryClient.invalidateQueries([`section:${sectionId}`]);
      }
    };

    window.addEventListener("imageCacheCleared", handleImageCacheCleared);

    return () => {
      window.removeEventListener("imageCacheCleared", handleImageCacheCleared);
    };
  }, [allSectionIds, queryClient]);

  // Calculate time until next refresh
  const timeUntilNextRefresh = Math.max(
    0,
    REFRESH_INTERVAL - (Date.now() - lastRefreshTime)
  );

  const secondsUntilRefresh = Math.ceil(timeUntilNextRefresh / 1000);
  const minutesUntilRefresh = Math.floor(secondsUntilRefresh / 60);
  const formattedTimeUntilRefresh = `${minutesUntilRefresh}`;

  // Check if there are any sections for the current media type filter
  const hasSectionsForCurrentFilter = () => {
    const typeMap = {
      movies: "movie",
      shows: "show",
      music: "artist",
    };

    if (activeMediaTypeFilter === "all") return processedSections.length > 0;

    return processedSections.some((section) => {
      const sectionType = mapSectionType(section);
      return sectionType === typeMap[activeMediaTypeFilter];
    });
  };

  // Sort sections - movies first, then shows, then music
  const sortedSections = useMemo(() => {
    return [...filteredSections].sort((a, b) => {
      const typeA = mapSectionType(a.section);
      const typeB = mapSectionType(b.section);

      // Define type priority for sorting
      const getTypePriority = (type) => {
        if (type === "movie") return 1;
        if (type === "show") return 2;
        if (type === "artist") return 3;
        return 4;
      };

      // First sort by type
      const typeDiff = getTypePriority(typeA) - getTypePriority(typeB);
      if (typeDiff !== 0) return typeDiff;

      // Then by name
      const nameA = (a.section?.name || "").toLowerCase();
      const nameB = (b.section?.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [filteredSections]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Recently Added
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-800/50 rounded-lg border border-accent">
              <Icons.Film size={14} className="text-accent" />
              <span className="text-theme-muted text-sm">
                {processedSections.length} Sections
              </span>
            </div>
            {isRefreshing ? (
              <span className="text-xs text-theme-muted">Refreshing...</span>
            ) : (
              <span className="text-xs text-theme-muted">
                Auto-refresh in {formattedTimeUntilRefresh}min
              </span>
            )}
          </div>
        </div>

        <ThemedButton
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="accent"
          icon={
            isRefreshing
              ? () => <Icons.RefreshCw className="text-accent animate-spin" />
              : Icons.RefreshCw
          }
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </ThemedButton>
      </div>

      {/* Media Type Subtabs */}
      <div className="flex gap-2 mb-4">
        <ThemedTabButton
          active={activeMediaTypeFilter === "all"}
          onClick={() => setActiveMediaTypeFilter("all")}
          icon={Icons.Grid}
        >
          All Media
        </ThemedTabButton>
        <ThemedTabButton
          active={activeMediaTypeFilter === "movies"}
          onClick={() => setActiveMediaTypeFilter("movies")}
          icon={Icons.Film}
        >
          Movies
        </ThemedTabButton>
        <ThemedTabButton
          active={activeMediaTypeFilter === "shows"}
          onClick={() => setActiveMediaTypeFilter("shows")}
          icon={Icons.Tv}
        >
          TV Shows
        </ThemedTabButton>
        <ThemedTabButton
          active={activeMediaTypeFilter === "music"}
          onClick={() => setActiveMediaTypeFilter("music")}
          icon={Icons.Music}
        >
          Music
        </ThemedTabButton>
      </div>

      {/* Error handling */}
      {error && (
        <ThemedCard className="bg-red-500/10 border-red-500/20 p-6 text-center flex flex-col items-center">
          <div className="flex justify-center mb-4">
            <Icons.AlertCircle size={24} className="text-red-400 mb-2" />
          </div>
          <p className="text-red-400">{error}</p>
          <ThemedButton
            onClick={handleRefresh}
            className="mt-4"
            variant="danger"
            icon={Icons.RefreshCw}
          >
            Try Again
          </ThemedButton>
        </ThemedCard>
      )}

      {/* No sections message */}
      {!processedSections.length && (
        <ThemedCard className="p-8 text-center flex flex-col items-center">
          <div className="flex justify-center mb-4">
            <Icons.Film size={32} className="text-accent opacity-70" />
          </div>
          <p className="text-theme-muted mb-2">
            No library sections have been saved yet
          </p>
          <p className="text-sm text-theme-muted max-w-md mb-4">
            To get started, visit the Libraries tab and select which sections
            you'd like to display here.
          </p>
          <ThemedButton
            onClick={() => {
              // Multiple navigation methods
              window.dispatchEvent(new CustomEvent("navigateToLibraries"));

              // Fallback navigation methods
              if (
                window.routerNavigate &&
                typeof window.routerNavigate === "function"
              ) {
                window.routerNavigate("/libraries");
              } else if (window.location) {
                window.location.href = "/libraries";
              }
            }}
            variant="accent"
            icon={Icons.Library}
          >
            Go to Libraries
          </ThemedButton>
        </ThemedCard>
      )}

      {/* No libraries of specific type */}
      {processedSections.length > 0 && !hasSectionsForCurrentFilter() && (
        <NoLibrariesCard type={activeMediaTypeFilter} />
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {[...Array(12)].map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {sortedSections.length === 0 ? (
            <ThemedCard className="p-8 text-center">
              <Icons.Search
                size={48}
                className="mx-auto mb-4 text-accent opacity-70"
              />
              <h3 className="text-xl font-medium text-white mb-2">
                No media found
              </h3>
              <p className="text-theme-muted">
                There are no recently added items for the selected filter.
              </p>
            </ThemedCard>
          ) : (
            sortedSections.map((sectionData, sectionIndex) => {
              if (
                !sectionData.section ||
                !sectionData.media ||
                sectionData.media.length === 0
              ) {
                return null;
              }

              // Get the section name and type
              const sectionName = sectionData.section.name || "Unknown Section";
              const sectionType = mapSectionType(sectionData.section);
              const formattedType =
                sectionType.charAt(0).toUpperCase() + sectionType.slice(1);

              // Log section details for debugging
              logDebug(
                `Rendering section ${sectionName} (${sectionType}) with ${sectionData.media.length} items`
              );

              return (
                <div
                  key={`section-${
                    sectionData.section.section_id || sectionIndex
                  }`}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 pb-2 border-b border-accent">
                    <h3 className="text-xl font-medium text-white">
                      {sectionName}
                    </h3>
                    <div className="px-2 py-1 bg-gray-800/50 rounded-lg border border-accent">
                      <span className="text-theme-muted text-sm">
                        {formattedType}
                      </span>
                    </div>
                  </div>

                  {sectionData.media.length === 0 ? (
                    <EmptySection type={sectionType} />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {sectionData.media
                        .slice(0, 6)
                        .map((media, mediaIndex) => (
                          <MediaCard
                            key={`${sectionData.section.section_id}-${
                              media.rating_key || mediaIndex
                            }-${lastRefreshTime}`}
                            media={media}
                          />
                        ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default RecentlyAdded;
