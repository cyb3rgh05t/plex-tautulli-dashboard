import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useConfig } from "../../context/ConfigContext";
import { logError, logInfo, logDebug, logWarn } from "../../utils/logger";
import * as Icons from "lucide-react";
import MediaCard from "./MediaCard";
import ThemedButton from "../common/ThemedButton";
import ThemedCard from "../common/ThemedCard";
import { useTheme } from "../../context/ThemeContext.jsx";
import axios from "axios";
import ThemedTabButton from "../common/ThemedTabButton";
import { useQuery, useQueryClient, useQueries } from "react-query";
import toast from "react-hot-toast";
import * as posterCacheService from "../../services/posterCacheService";

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
          // Check if we have data in cache already from preloading
          const cachedData = queryClient.getQueryData([`section:${sectionId}`]);
          if (cachedData && cachedData.media && cachedData.media.length > 0) {
            logDebug(`Using cached data for section ${sectionId}`);
            return cachedData;
          }

          // Direct API call to get recently added for this specific section
          const response = await axios.get(`/api/tautulli/api/v2`, {
            params: {
              apikey: config.tautulliApiKey,
              cmd: "get_recently_added",
              section_id: sectionId,
              count: 12, // Request enough items to show
            },
          });

          if (response.data?.response?.result !== "success") {
            throw new Error(`Error fetching section ${sectionId}`);
          }

          // Get section info
          const section = processedSections.find(
            (s) => s.section_id === sectionId
          );

          // Process each media item to ensure it has a cached poster
          const mediaItems = await Promise.all(
            (response.data?.response?.data?.recently_added || []).map(
              async (item) => {
                const enhancedItem = {
                  ...item,
                  apiKey: config.tautulliApiKey,
                  section_id: sectionId,
                  section_type: section?.type || "unknown",
                };

                // Check if this item has a thumb path we can use for the poster
                const thumbPath =
                  posterCacheService.getAppropriateThumbPath(enhancedItem);

                if (thumbPath) {
                  // Request to cache this poster (but don't wait for completion)
                  posterCacheService
                    .cachePoster(
                      item.rating_key,
                      thumbPath,
                      config.tautulliApiKey,
                      enhancedItem.media_type
                    )
                    .catch((err) => {
                      logWarn(
                        `Background caching failed for ${item.rating_key}:`,
                        err
                      );
                    });

                  // Get the cached poster URL
                  enhancedItem.cached_poster_url =
                    posterCacheService.getCachedPosterUrl(item.rating_key);
                }

                return enhancedItem;
              }
            )
          );

          return {
            media: mediaItems,
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
    // Listen for 'newMediaDetected' event
    const handleNewMediaDetected = () => {
      logInfo("New media detected event received, refreshing data");
      handleRefresh();
    };

    window.addEventListener("newMediaDetected", handleNewMediaDetected);

    return () => {
      window.removeEventListener("newMediaDetected", handleNewMediaDetected);
    };
  }, []);

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

  // Effect for handling route changes and refreshing data when navigating to this tab
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
  }, [location.pathname, queryClient, allSectionIds, sectionQueries]);

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

    // Also listen for poster cache cleared events
    const handlePosterCacheCleared = () => {
      logInfo("Poster cache cleared event received, refreshing data");
      // Force refresh all section queries
      for (const sectionId of allSectionIds) {
        queryClient.invalidateQueries([`section:${sectionId}`]);
      }
    };

    window.addEventListener("posterCacheCleared", handlePosterCacheCleared);

    return () => {
      window.removeEventListener("imageCacheCleared", handleImageCacheCleared);
      window.removeEventListener(
        "posterCacheCleared",
        handlePosterCacheCleared
      );
    };
  }, [allSectionIds, queryClient]);

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
            {isRefreshing && (
              <span className="text-xs text-theme-muted">Refreshing...</span>
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

              // Sort the media items by added_at date (newest first)
              const sortedMedia = [...sectionData.media].sort(
                (a, b) => parseInt(b.added_at || 0) - parseInt(a.added_at || 0)
              );

              return (
                <div
                  key={`section-${
                    sectionData.section.section_id || sectionIndex
                  }`}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-accent">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-medium text-white">
                        {sectionName}
                      </h3>
                      <div className="px-2 py-1 bg-gray-800/50 rounded-lg border border-accent">
                        <span className="text-theme-muted text-sm">
                          {formattedType}
                        </span>
                      </div>
                    </div>

                    {/* Section Actions */}
                    <div>
                      <ThemedButton
                        onClick={async () => {
                          try {
                            // Show loading toast
                            toast.loading(
                              `Refreshing posters for ${sectionName}...`,
                              {
                                id: `section-${sectionData.section.section_id}`,
                              }
                            );

                            try {
                              // First try using the API endpoint
                              await axios.post("/api/refresh-posters", {
                                sectionId: sectionData.section.section_id,
                              });
                            } catch (apiError) {
                              // If the server-side endpoint fails, we'll use a fallback approach
                              logWarn(
                                `API endpoint for refreshing section failed: ${apiError.message}`
                              );

                              // Alternative approach: clear cache and invalidate queries
                              // 1. Clear image cache first
                              await axios.get("/api/clear-image-cache");

                              // 2. If section has media items, try to refresh their posters individually
                              const refreshPromises = sortedMedia
                                .slice(0, 6)
                                .map(async (mediaItem) => {
                                  try {
                                    if (mediaItem.rating_key) {
                                      // Clear the cache for this specific poster
                                      await axios.post(
                                        `/api/posters/cache/clear/${mediaItem.rating_key}`
                                      );

                                      // Re-cache the poster with fresh data
                                      const thumbPath =
                                        posterCacheService.getAppropriateThumbPath(
                                          mediaItem
                                        );
                                      if (thumbPath && mediaItem.apiKey) {
                                        return posterCacheService.cachePoster(
                                          mediaItem.rating_key,
                                          thumbPath,
                                          mediaItem.apiKey,
                                          mediaItem.media_type
                                        );
                                      }
                                    }
                                    return Promise.resolve();
                                  } catch (itemError) {
                                    // Log but continue with other items
                                    logWarn(
                                      `Failed to refresh poster for ${mediaItem.title}: ${itemError.message}`
                                    );
                                    return Promise.resolve();
                                  }
                                });

                              // Wait for all the individual refresh operations to complete
                              await Promise.allSettled(refreshPromises);
                            }

                            // Force cache refresh regardless of which method was used
                            queryClient.invalidateQueries([
                              `section:${sectionData.section.section_id}`,
                            ]);

                            // Success toast
                            toast.success(
                              `Refreshed ${sectionName} posters. Changes may take a moment to appear.`,
                              {
                                id: `section-${sectionData.section.section_id}`,
                                duration: 5000,
                              }
                            );

                            // Trigger a global refresh event
                            window.dispatchEvent(
                              new CustomEvent("posterCacheCleared", {
                                detail: { timestamp: Date.now() },
                              })
                            );
                          } catch (error) {
                            console.error(
                              `Failed to refresh section ${sectionName}:`,
                              error
                            );
                            toast.error(
                              `Failed to refresh ${sectionName} posters: ${error.message}`,
                              {
                                id: `section-${sectionData.section.section_id}`,
                              }
                            );
                          }
                        }}
                        variant="ghost"
                        size="sm"
                        title="Refresh all posters in this section"
                        icon={Icons.RefreshCw}
                      >
                        Refresh Posters
                      </ThemedButton>
                    </div>
                  </div>

                  {sortedMedia.length === 0 ? (
                    <EmptySection type={sectionType} />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {sortedMedia.slice(0, 6).map((media, mediaIndex) => (
                        <MediaCard
                          key={`${sectionData.section.section_id}-${
                            media.rating_key || "unknown"
                          }-${mediaIndex}-${Math.random()
                            .toString(36)
                            .substr(2, 5)}`}
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
