// with theme styling applied

import React, { useState, useEffect, useRef } from "react";
import { useConfig } from "../../context/ConfigContext";
import { logError } from "../../utils/logger";
import * as Icons from "lucide-react";
import MediaModal from "./MediaModal";
import ThemedButton from "../common/ThemedButton";
import ThemedCard from "../common/ThemedCard";
import { useTheme } from "../../context/ThemeContext";
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

const MediaCard = ({ media }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [resolution, setResolution] = useState(null);

  // Fetch resolution metadata
  useEffect(() => {
    const fetchResolution = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/tautulli/api/v2`,
          {
            params: {
              apikey: media.apiKey,
              cmd: "get_metadata",
              rating_key: media.rating_key,
            },
          }
        );

        const mediaInfo = response.data?.response?.data?.media_info?.[0];
        if (mediaInfo) {
          const videoResolution = mediaInfo.video_full_resolution;
          setResolution(videoResolution);
        }
      } catch (error) {
        console.error("Failed to fetch resolution:", error);
      }
    };

    // Only fetch if rating_key exists
    if (media.rating_key) {
      fetchResolution();
    }
  }, [media.rating_key, media.apiKey]);

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

  const getDisplayTitle = () => {
    // Use our safe media type getter
    const mediaType = getMediaType();

    switch (mediaType) {
      case "movie":
        return media.title;
      case "episode":
        return media.grandparent_title;
      case "season":
        return media.grandparent_title;
      case "show":
        return media.title;
      default:
        return media.title || "Unknown";
    }
  };

  const getDisplaySubtitle = () => {
    // Use our safe media type getter
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
      default:
        return "";
    }
  };

  // Add safety check for media_type
  const getMediaType = () => {
    return media.media_type && typeof media.media_type === "string"
      ? media.media_type.toLowerCase()
      : "unknown";
  };

  const getThumbnailUrl = (media, apiKey) => {
    let thumbPath;

    // Use our safe media type getter
    const mediaType = getMediaType();

    switch (mediaType) {
      case "movie":
        thumbPath = media.parent_thumb;
        break;
      case "show":
        thumbPath = media.parent_thumb;
        break;
      case "episode":
        thumbPath = media.grandparent_thumb;
        break;
      case "season":
        thumbPath = media.grandparent_thumb;
        break;
      default:
        thumbPath = media.thumb;
    }

    if (!thumbPath) {
      thumbPath = media.thumb;
    }

    return `${API_BASE_URL}/api/tautulli/pms_image_proxy?img=${encodeURIComponent(
      thumbPath || ""
    )}&apikey=${apiKey}`;
  };

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="group cursor-pointer space-y-2"
      >
        <div
          className="relative aspect-[2/3] rounded-xl overflow-hidden 
          bg-gray-800/50 border border-gray-700/50 
          group-hover:border-accent group-hover:shadow-accent-lg
          transition-all duration-200"
        >
          {/* Loading State */}
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-modal backdrop-blur-sm">
              <div className="animate-spin mr-2">
                <Icons.Loader2 className="h-8 w-8 text-accent-base" />
              </div>
            </div>
          )}

          {/* Image */}
          {!imageError ? (
            <img
              src={getThumbnailUrl(media, media.apiKey)}
              alt={media.title || "Media"}
              className={`w-full h-full object-cover transition-all duration-300 
                group-hover:scale-105 ${
                  imageLoading ? "opacity-0" : "opacity-100"
                }`}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/50">
              <Icons.Film size={32} className="text-gray-500 mb-2" />
              <span className="text-theme-muted text-sm">No Preview</span>
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
              border border-gray-700/50 text-theme-muted text-xs font-medium 
              flex items-center gap-1"
            >
              <Icons.Clock3 size={12} />
              {getRelativeAddedTime(media.added_at)}
            </div>

            {/* Resolution Badge */}
            {resolution && (
              <div
                className="px-2 py-1 bg-accent-base/20 backdrop-blur-sm rounded-lg 
                border border-accent/20 text-accent-base text-xs font-medium"
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
          <div className="flex items-center gap-2 text-sm accent-base">
            {getDisplaySubtitle() && (
              <span className="text-accent-base">{getDisplaySubtitle()}</span>
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
  <div className="space-y-2 animate-pulse">
    <div className="aspect-[2/3] rounded-xl bg-modal border border-gray-700/50" />
    <div className="space-y-2 px-1">
      <div className="h-4 bg-modal rounded w-3/4" />
      <div className="h-3 bg-modal rounded w-1/2" />
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
      <Icon size={32} className="text-gray-500 mb-3" />
      <p className="text-theme-muted font-medium mb-1">{message}</p>
      <p className="text-sm text-theme-muted">{hint}</p>
    </ThemedCard>
  );
};

// Helper function to get type priority for sorting
const getTypePriority = (type) => {
  const typeStr = (type || "").toString().toLowerCase();
  if (typeStr === "movie") return 1;
  if (typeStr === "show") return 2;
  if (typeStr === "artist") return 3;
  return 4; // other types
};

const MediaTypeSubTab = ({ active, onClick, icon: Icon, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      active
        ? "bg-accent-light text-accent-base"
        : "text-gray-400 hover:text-white hover:bg-gray-700/50"
    }`}
  >
    {Icon && <Icon size={16} />}
    {children}
  </button>
);

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
    <div className="flex items-center justify-center min-h-[300px] bg-green-900/20 border border-green-500/30 rounded-xl p-8">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Icon size={48} className="text-green-500 opacity-70" />
        </div>
        <h3 className="text-green-400 text-xl font-semibold mb-2">
          No {description} have been saved yet
        </h3>
        <p className="text-green-300 text-sm max-w-md mx-auto mb-6">
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
    </div>
  );
};

const RecentlyAdded = () => {
  const { config } = useConfig();
  const [sections, setSections] = useState([]);
  const [sectionMedia, setSectionMedia] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const refreshInterval = useRef(null);
  const REFRESH_INTERVAL = 600000; // 10 minutes in milliseconds

  // New state for media type filtering
  const [activeMediaTypeFilter, setActiveMediaTypeFilter] = useState("all");

  // Fetch saved sections
  const fetchSections = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sections`);
      const data = await response.json();

      // Check if sections are available and in the expected format
      const processedSections = (data.sections || []).map((section) => {
        // Handle both raw_data and direct section format
        const sectionData = section.raw_data || section;

        return {
          ...sectionData,
          // Ensure type is always available by looking at different possible properties
          type: sectionData.type || sectionData.section_type || "unknown",
          // Ensure name is always available
          name:
            sectionData.name || sectionData.section_name || "Unknown Section",
        };
      });

      setSections(processedSections);
      return processedSections;
    } catch (error) {
      logError("Failed to fetch sections", error);
      setError("Failed to load sections");
      return [];
    }
  };

  // Fetch recently added media for a specific section
  const fetchSectionRecentlyAdded = async (sectionId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tautulli/api/v2?apikey=${config.tautulliApiKey}&cmd=get_recently_added&section_id=${sectionId}&count=10`
      );
      const data = await response.json();

      if (data?.response?.result === "success") {
        return data.response.data.recently_added || [];
      }
      return [];
    } catch (error) {
      logError(
        `Failed to fetch recently added for section ${sectionId}`,
        error
      );
      return [];
    }
  };

  const handleRefresh = async () => {
    // Prevent multiple refreshes happening at once
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const savedSections = await fetchSections();
      const sectionMediaResults = {};

      for (const section of savedSections) {
        // Skip if section_id is missing
        if (!section.section_id) {
          console.warn("Section missing section_id, skipping:", section);
          continue;
        }

        const media = await fetchSectionRecentlyAdded(section.section_id);
        const transformedMedia = media.map((item) => ({
          ...item,
          apiKey: config.tautulliApiKey,
        }));

        sectionMediaResults[section.section_id] = {
          ...section,
          media: transformedMedia,
        };
      }

      setSectionMedia(sectionMediaResults);
      setLastRefreshTime(Date.now());
    } catch (error) {
      logError("Failed to refresh media", error);
      setError("Failed to refresh media");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    const loadSectionMedia = async () => {
      setIsLoading(true);
      setError(null);
      await handleRefresh();
      setIsLoading(false);
    };

    if (config.tautulliApiKey) {
      loadSectionMedia();
      setLastRefreshTime(Date.now());

      // Setup interval for auto-refresh
      refreshInterval.current = setInterval(() => {
        handleRefresh();
      }, REFRESH_INTERVAL);

      // Cleanup interval on unmount
      return () => {
        if (refreshInterval.current) {
          clearInterval(refreshInterval.current);
        }
      };
    }
  }, [config.tautulliApiKey]);

  // Calculate time until next refresh
  const timeUntilNextRefresh = Math.max(
    0,
    REFRESH_INTERVAL - (Date.now() - lastRefreshTime)
  );
  const secondsUntilRefresh = Math.ceil(timeUntilNextRefresh / 1000);
  const minutesUntilRefresh = Math.floor(secondsUntilRefresh / 60);
  const remainingSeconds = secondsUntilRefresh % 60;
  const formattedTimeUntilRefresh = `${minutesUntilRefresh}`;

  const getSortedSectionEntries = () => {
    const allEntries = Object.entries(sectionMedia);

    // Filter based on media type
    const filteredEntries = allEntries.filter(([_, sectionData]) => {
      // Check if no filter is selected or matches current media type
      if (activeMediaTypeFilter === "all") return true;

      const sectionType = (
        sectionData.type ||
        sectionData.section_type ||
        "unknown"
      ).toLowerCase();

      // Map filter to actual type
      const typeMap = {
        movies: "movie",
        shows: "show",
        music: "artist",
      };

      return sectionType === typeMap[activeMediaTypeFilter];
    });

    // Sort as before
    return filteredEntries.sort((a, b) => {
      const typeA = a[1]?.type || a[1]?.section_type || "unknown";
      const typeB = b[1]?.type || b[1]?.section_type || "unknown";
      return getTypePriority(typeA) - getTypePriority(typeB);
    });
  };

  // Check if there are any sections for the current media type filter
  const hasSectionsForCurrentFilter = () => {
    const typeMap = {
      movies: "movie",
      shows: "show",
      music: "artist",
    };

    if (activeMediaTypeFilter === "all") return sections.length > 0;

    return sections.some((section) => {
      const sectionType = (
        section.type ||
        section.section_type ||
        "unknown"
      ).toLowerCase();
      return sectionType === typeMap[activeMediaTypeFilter];
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Recently Added
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <Icons.Film size={14} className="text-accent-base" />
              <span className="text-theme-muted text-sm">
                {sections.length} Sections
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
              ? () => <Icons.RefreshCw className="animate-spin" />
              : Icons.RefreshCw
          }
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </ThemedButton>
      </div>

      {/* Media Type Subtabs */}
      <div className="flex gap-2 mb-4">
        <MediaTypeSubTab
          active={activeMediaTypeFilter === "all"}
          onClick={() => setActiveMediaTypeFilter("all")}
          icon={Icons.Grid}
        >
          All Media
        </MediaTypeSubTab>
        <MediaTypeSubTab
          active={activeMediaTypeFilter === "movies"}
          onClick={() => setActiveMediaTypeFilter("movies")}
          icon={Icons.Film}
        >
          Movies
        </MediaTypeSubTab>
        <MediaTypeSubTab
          active={activeMediaTypeFilter === "shows"}
          onClick={() => setActiveMediaTypeFilter("shows")}
          icon={Icons.Tv}
        >
          TV Shows
        </MediaTypeSubTab>
        <MediaTypeSubTab
          active={activeMediaTypeFilter === "music"}
          onClick={() => setActiveMediaTypeFilter("music")}
          icon={Icons.Music}
        >
          Music
        </MediaTypeSubTab>
      </div>

      {/* Existing rendering logic remains the same */}
      {error && (
        <ThemedCard className="bg-red-500/10 border-red-500/20 p-6 text-center flex flex-col items-center">
          <Icons.AlertCircle size={24} className="text-red-400 mb-2" />
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

      {!sections.length && (
        <ThemedCard className="p-8 text-center flex flex-col items-center">
          <Icons.Film size={32} className="text-gray-500 mb-3" />
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

      {/* New condition for no libraries of specific type */}
      {sections.length > 0 && !hasSectionsForCurrentFilter() && (
        <NoLibrariesCard type={activeMediaTypeFilter} />
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {[...Array(12)].map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {getSortedSectionEntries().map(([sectionId, sectionData]) => {
            // Check if the section data is valid
            if (!sectionData || typeof sectionData !== "object") {
              return null;
            }

            // Get section type safely
            const sectionType =
              sectionData.type || sectionData.section_type || "unknown";

            // Format the type for display
            const formattedType =
              typeof sectionType === "string"
                ? sectionType.charAt(0).toUpperCase() + sectionType.slice(1)
                : "Unknown";

            return (
              <div key={sectionId} className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-gray-700/50">
                  <h3 className="text-xl font-medium text-white">
                    {sectionData.name || "Unknown Section"}
                  </h3>
                  <div className="px-2 py-1 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <span className="text-theme-muted text-sm">
                      {formattedType}
                    </span>
                  </div>
                </div>

                {!sectionData.media || sectionData.media.length === 0 ? (
                  <EmptySection type={sectionType} />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {sectionData.media.map((media) => (
                      <MediaCard
                        key={`${media.media_type || "unknown"}-${
                          media.rating_key ||
                          Math.random().toString(36).substring(2, 9)
                        }`}
                        media={media}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentlyAdded;
