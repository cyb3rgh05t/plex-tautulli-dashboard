import React, { useState, useEffect, useRef } from "react";
import { useQueryClient } from "react-query";
import { useConfig } from "../../context/ConfigContext";
import { logInfo, logError, logDebug, logWarn } from "../../utils/logger";
import LoadingScreen from "./LoadingScreen";
import axios from "axios";
import * as posterCacheService from "../../services/posterCacheService";

/**
 * Enhanced GlobalPreloader with strict fast path determination
 * and exactly 10 items per section in the cache
 */
const GlobalPreloader = ({ children }) => {
  const { config, isConfigured, isLoading: configLoading } = useConfig();
  const queryClient = useQueryClient();
  const [isPreloading, setIsPreloading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState(
    "Checking application state..."
  );
  const [loadingDetails, setLoadingDetails] = useState("");

  // Preload state refs
  const preloadStarted = useRef(false);
  const preloadComplete = useRef(false);
  const forceFullPreload = useRef(false);

  // Store loading tasks completion state
  const loadingTasks = useRef({
    config: false,
    sections: false,
    media: false,
    activities: false,
    libraries: false,
    posters: false,
    metadata: false,
  });

  // Expose forceFullPreload ref through window for external triggering
  useEffect(() => {
    // Expose force preload function globally for external components
    window.forceGlobalPreload = false;

    return () => {
      delete window.forceGlobalPreload;
    };
  }, []);

  // Check if fast path is enabled - this is controlled by localStorage
  const isFastPathEnabled = () => {
    // Only return true if we've explicitly stored that fast path is ready
    return localStorage.getItem("fastPathReady") === "true";
  };

  // Check if poster cache exists and has content
  const checkPosterCache = async () => {
    try {
      // Try to fetch cached poster stats using multiple methods
      try {
        // Method 1: Use the poster cache stats API
        const stats = await posterCacheService.getPosterCacheStats();

        // If poster count is 0, consider the cache empty
        if (!stats.count || stats.count === 0) {
          logInfo("Poster cache is empty, forcing full preload");
          return false;
        }

        logInfo(
          `Poster cache has ${stats.count} posters, fast path can be used`
        );
        return true;
      } catch (apiError) {
        // If the API call fails, try a different approach
        logWarn("Error checking poster cache through API:", apiError);

        // Method 2: Check if FastPathReady is set in localStorage
        if (isFastPathEnabled()) {
          // Look for the "lastPostersCount" value that might have been stored
          const lastCount = localStorage.getItem("lastPostersCount");
          if (lastCount && parseInt(lastCount) > 0) {
            logInfo(
              `Using cached poster count (${lastCount}) from localStorage`
            );
            return true;
          }

          // If fast path is ready but no count, we'll assume posters exist
          // since a successful preload would have occurred previously
          logInfo(
            "Fast path is ready but no poster count, assuming posters exist"
          );
          return true;
        }
      }

      // If we reach here, we couldn't confirm poster cache exists
      logInfo(
        "Could not verify poster cache status, defaulting to full preload"
      );
      return false;
    } catch (error) {
      // Catch-all for any other errors
      logWarn("Error checking poster cache status:", error);
      return false;
    }
  };

  // Fast path should be used if:
  // 1. Fast path is enabled in localStorage
  // 2. Config hasn't changed since last load
  // 3. We're not forcing a full preload
  // 4. We can determine that poster cache likely exists
  const shouldUseFastPath = async () => {
    // Check if force refresh is requested via window object
    if (window.forceGlobalPreload) {
      // Reset the flag
      window.forceGlobalPreload = false;
      logInfo(
        "Bypassing fast path due to forced global preload via window object"
      );
      return false;
    }

    // Check if force refresh is requested via localStorage
    const forceRefresh = localStorage.getItem("forceRefreshOnLoad");
    if (forceRefresh) {
      // Remove the flag
      localStorage.removeItem("forceRefreshOnLoad");
      logInfo("Bypassing fast path due to forced refresh from localStorage");
      return false;
    }

    if (forceFullPreload.current) {
      logInfo("Bypassing fast path due to forced full preload");
      return false;
    }

    if (!isFastPathEnabled()) {
      logInfo("Fast path not enabled yet");
      return false;
    }

    // Check if config has changed
    const storedConfigHash = localStorage.getItem("configHash");
    const currentConfigHash = JSON.stringify(config);

    if (storedConfigHash !== currentConfigHash) {
      logInfo("Config has changed, cannot use fast path");
      return false;
    }

    // Check if poster cache exists and has content
    const posterCacheExists = await checkPosterCache();
    if (!posterCacheExists) {
      logInfo("Poster cache is empty or missing, cannot use fast path");
      return false;
    }

    logInfo("Using fast path for preloading");
    return true;
  };

  // Fast path preloading - just verify essential data is in cache
  const performFastPathPreload = async () => {
    logInfo("Starting fast path preloading");
    setLoadingMessage("Checking application data...");
    setLoadingProgress(30);

    try {
      // 1. Verify sections data
      const sectionsResponse = await axios.get("/api/sections");
      const sectionsData = sectionsResponse.data;

      if (
        !sectionsData ||
        !sectionsData.sections ||
        sectionsData.sections.length === 0
      ) {
        logInfo("No sections found, switching to full preload");
        // Fall back to full preload if sections data is missing
        forceFullPreload.current = true;
        performFullPreload();
        return;
      }

      // Cache the sections data
      queryClient.setQueryData(["sections"], sectionsData);
      setLoadingProgress(50);

      // 2. Get minimal data needed for the UI
      setLoadingMessage("Loading essential data...");

      // Fast load of activities
      try {
        const activitiesResponse = await axios.get("/api/downloads");
        queryClient.setQueryData(
          ["plexActivities"],
          activitiesResponse.data.activities || []
        );
      } catch (error) {
        logWarn("Failed to load activities in fast path:", error);
      }

      setLoadingProgress(70);

      // 3. Libraries data (needed for most screens)
      try {
        const librariesResponse = await axios.get("/api/libraries");
        queryClient.setQueryData(["libraries"], librariesResponse.data);
      } catch (error) {
        logWarn("Failed to load libraries in fast path:", error);
      }

      // Set up timestamps for media monitoring
      const allSections = sectionsData?.sections || [];
      const sectionIds = allSections
        .map((section) => {
          const sectionData = section.raw_data || section;
          return sectionData.section_id;
        })
        .filter(Boolean);

      window.plexDataTimestamps = {
        lastCheck: Date.now(),
        sections: Object.fromEntries(sectionIds.map((id) => [id, Date.now()])),
      };

      setLoadingProgress(100);
      setLoadingMessage("Application ready");
      logInfo("Fast path preloading complete");

      // Brief delay for smooth transition
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Done preloading
      setIsPreloading(false);
      preloadComplete.current = true;
    } catch (error) {
      logError("Error during fast path preloading:", error);

      // If fast path fails, try full preload
      logInfo("Fast path failed, falling back to full preload");
      forceFullPreload.current = true;
      performFullPreload();
    }
  };

  // Full preloading path - download all posters, metadata, etc.
  const performFullPreload = async () => {
    logInfo("Starting full preloading process");
    setLoadingMessage("Starting full preload...");
    setLoadingDetails("This may take a few minutes");
    setLoadingProgress(5);

    try {
      // Step 1: Check configuration
      setLoadingMessage("Checking configuration...");
      setLoadingDetails("Verifying Plex and Tautulli connections");

      // If not configured, skip preloading
      if (!isConfigured()) {
        logInfo("Application not configured, skipping preloading");
        setLoadingProgress(100);
        setIsPreloading(false);
        preloadComplete.current = true;
        return;
      }

      loadingTasks.current.config = true;
      setLoadingProgress(10);

      // Step 2: Load sections data
      setLoadingMessage("Loading library sections...");
      setLoadingDetails("Retrieving your Plex libraries");

      let sectionsData;
      try {
        const sectionsResponse = await axios.get("/api/sections");
        sectionsData = sectionsResponse.data;

        // If no sections, skip the rest of preloading
        if (
          !sectionsData ||
          !sectionsData.sections ||
          sectionsData.sections.length === 0
        ) {
          logInfo("No sections found, skipping media preloading");
          setLoadingProgress(100);
          setIsPreloading(false);
          preloadComplete.current = true;
          return;
        }

        // Cache the sections data
        queryClient.setQueryData(["sections"], sectionsData);

        loadingTasks.current.sections = true;
        setLoadingProgress(20);
        logInfo(
          `✅ Loaded ${sectionsData.sections?.length || 0} library sections`
        );
      } catch (error) {
        logError("Failed to load sections:", error);
        throw new Error("Failed to load library sections. Please try again.");
      }

      // Get all section IDs
      const allSections = sectionsData?.sections || [];
      const sectionIds = allSections
        .map((section) => {
          const sectionData = section.raw_data || section;
          return sectionData.section_id;
        })
        .filter(Boolean);

      // Step 3: Load media for each section and process metadata
      setLoadingMessage("Loading media content...");
      setLoadingDetails(`Processing ${sectionIds.length} libraries`);

      let loadedSections = 0;
      // Load each section sequentially
      for (const sectionId of sectionIds) {
        try {
          setLoadingDetails(
            `Loading library ${loadedSections + 1} of ${sectionIds.length}`
          );

          // Find section info
          const section = allSections.find((s) => {
            const sectionData = s.raw_data || s;
            return sectionData.section_id === sectionId;
          });
          const sectionName =
            section?.raw_data?.name || section?.name || `Section ${sectionId}`;
          const sectionType =
            section?.raw_data?.type ||
            section?.raw_data?.section_type ||
            "unknown";

          // Load exactly 10 recently added items for this section
          const response = await axios.get(`/api/tautulli/api/v2`, {
            params: {
              apikey: config.tautulliApiKey,
              cmd: "get_recently_added",
              section_id: sectionId,
              count: 10, // Exactly 10 items per section
            },
            timeout: 30000,
          });

          if (response.data?.response?.result === "success") {
            // Process media items - limit to exactly 10
            const mediaItems = (
              response.data?.response?.data?.recently_added || []
            )
              .slice(0, 10) // Ensure only 10 items max
              .map((item) => ({
                ...item,
                apiKey: config.tautulliApiKey,
                section_id: sectionId,
              }));

            if (mediaItems.length > 0) {
              logInfo(
                `Loading metadata and posters for ${mediaItems.length} items in "${sectionName}"`
              );

              // Process and cache metadata for each item (in smaller batches)
              const BATCH_SIZE = 5;
              let processedItems = 0;

              // Create the section cache object early to ensure all items go to the same place
              const sectionCache = {
                media: [],
                section: section?.raw_data || section,
              };

              for (let i = 0; i < mediaItems.length; i += BATCH_SIZE) {
                const batch = mediaItems.slice(i, i + BATCH_SIZE);

                // Process this batch in parallel
                await Promise.all(
                  batch.map(async (item) => {
                    try {
                      // Fetch full metadata for this item
                      const metadataResponse = await axios.get(
                        `/api/tautulli/api/v2`,
                        {
                          params: {
                            apikey: config.tautulliApiKey,
                            cmd: "get_metadata",
                            rating_key: item.rating_key,
                          },
                          timeout: 20000,
                        }
                      );

                      if (
                        metadataResponse.data?.response?.result === "success"
                      ) {
                        const metadata = metadataResponse.data.response.data;

                        // Enhance item with full metadata
                        const enhancedItem = {
                          ...item,
                          ...metadata,
                          complete_metadata: true,
                        };

                        // Download poster to cache
                        try {
                          // Get appropriate thumb path based on media type
                          const thumbPath =
                            posterCacheService.getAppropriateThumbPath(
                              enhancedItem
                            );

                          if (thumbPath) {
                            // Cache the poster (this is async but we don't wait)
                            posterCacheService.cachePoster(
                              item.rating_key,
                              thumbPath,
                              config.tautulliApiKey,
                              enhancedItem.media_type
                            );

                            // Set the cached poster URL
                            enhancedItem.cached_poster_url =
                              posterCacheService.getCachedPosterUrl(
                                item.rating_key
                              );
                          }
                        } catch (posterError) {
                          logWarn(
                            `Failed to cache poster for ${metadata.title}:`,
                            posterError
                          );
                        }

                        // Store in query cache for fast access
                        queryClient.setQueryData(
                          [`media:${item.rating_key}`],
                          enhancedItem
                        );

                        // Add to the section cache array
                        sectionCache.media.push(enhancedItem);
                      }
                    } catch (itemError) {
                      logWarn(
                        `Failed to process item ${item.rating_key}:`,
                        itemError
                      );
                    }

                    // Update processed count
                    processedItems++;
                  })
                );

                // Update loading progress based on both sections and items
                const sectionWeight = 1 / sectionIds.length; // Each section's weight
                const sectionProgress = loadedSections / sectionIds.length; // Progress through sections
                const itemProgress = processedItems / mediaItems.length; // Progress through items in this section

                const combinedProgress =
                  20 +
                  Math.floor(
                    (sectionProgress + itemProgress * sectionWeight) * 40
                  );
                setLoadingProgress(combinedProgress);
                setLoadingDetails(
                  `Processed ${processedItems}/${mediaItems.length} items in ${sectionName}`
                );

                // Small pause between batches
                await new Promise((resolve) => setTimeout(resolve, 200));
              }

              // Update the section cache - ensure we have exactly 10 items maximum
              if (sectionCache.media.length > 10) {
                sectionCache.media = sectionCache.media.slice(0, 10);
              }

              // Store the entire section cache
              queryClient.setQueryData([`section:${sectionId}`], sectionCache);
            }
          }

          // Update progress
          loadedSections++;
        } catch (sectionError) {
          logWarn(`Failed to process section ${sectionId}:`, sectionError);
          // Continue with other sections even if one fails
        }
      }

      loadingTasks.current.media = true;
      loadingTasks.current.metadata = true;
      loadingTasks.current.posters = true;
      setLoadingProgress(60);

      // Step 4: Load other essential data in parallel
      setLoadingMessage("Loading application data...");
      setLoadingDetails("Getting activities and libraries");

      try {
        // Activities data
        const activitiesResponse = await axios.get("/api/downloads");
        queryClient.setQueryData(
          ["plexActivities"],
          activitiesResponse.data.activities || []
        );
        loadingTasks.current.activities = true;
        logInfo("✅ Loaded activities data");
      } catch (error) {
        logWarn("Failed to load activities:", error);
      }

      try {
        // Libraries data
        const librariesResponse = await axios.get("/api/libraries");
        queryClient.setQueryData(["libraries"], librariesResponse.data);
        loadingTasks.current.libraries = true;
        logInfo("✅ Loaded libraries data");
      } catch (error) {
        logWarn("Failed to load libraries:", error);
      }

      setLoadingProgress(80);

      // Step 5: Final preparation
      setLoadingMessage("Finalizing application...");
      setLoadingDetails("Preparing user interface");

      // Prepare data for monitoring recently added content
      window.plexDataTimestamps = {
        lastCheck: Date.now(),
        sections: Object.fromEntries(sectionIds.map((id) => [id, Date.now()])),
      };

      // Get poster cache stats
      try {
        const cacheStatsResponse = await axios.get("/api/posters/cache/stats");
        const postersCount = cacheStatsResponse.data.count || 0;
        logInfo(`✅ Poster cache contains ${postersCount} posters`);

        // Store poster count for future fast path decisions
        localStorage.setItem("lastPostersCount", postersCount.toString());
      } catch (error) {
        logWarn("Failed to get poster cache stats:", error);
      }

      // Store current config hash to detect changes
      localStorage.setItem("configHash", JSON.stringify(config));

      // Mark fast path as ready for next time
      localStorage.setItem("fastPathReady", "true");

      // Complete loading
      setLoadingProgress(100);
      setLoadingMessage("Loading complete!");
      setLoadingDetails("");

      // Short delay before revealing UI
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mark preloading as complete
      setIsPreloading(false);
      preloadComplete.current = true;
      logInfo("✅ Application full preloading completed successfully");
    } catch (error) {
      logError("❌ Error during application preloading:", error);

      // Show error message in loading screen
      setLoadingMessage("Error during loading");
      setLoadingDetails(error.message || "An unexpected error occurred");

      // Even on error, continue to show app after a delay
      setLoadingProgress(100);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      setIsPreloading(false);
      preloadComplete.current = true;
    }
  };

  // Main preloading effect
  useEffect(() => {
    // Skip if already preloading or completed, or if config is still loading
    if (preloadStarted.current || preloadComplete.current || configLoading) {
      return;
    }

    // Start the preloading process
    const runPreload = async () => {
      preloadStarted.current = true;
      setIsPreloading(true);

      try {
        // First check if we're even configured
        if (!isConfigured()) {
          logInfo("Application not configured, skipping preloading");
          setLoadingProgress(100);
          setIsPreloading(false);
          preloadComplete.current = true;
          return;
        }

        // Decide which path to take
        const useFastPath = await shouldUseFastPath();
        if (useFastPath) {
          await performFastPathPreload();
        } else {
          await performFullPreload();
        }
      } catch (error) {
        logError("❌ Error during preload decision:", error);

        // Show error message in loading screen
        setLoadingMessage("Error during loading");
        setLoadingDetails(error.message || "An unexpected error occurred");

        // Even on error, continue to show app after a delay
        setLoadingProgress(100);

        await new Promise((resolve) => setTimeout(resolve, 2000));

        setIsPreloading(false);
        preloadComplete.current = true;
      }
    };

    // Start preloading
    runPreload();
  }, [queryClient, isConfigured, configLoading, config]);

  // Listen for route changes to detect when to preload
  useEffect(() => {
    const handleRouteChange = () => {
      // If preload is complete and force refresh is requested
      if (
        preloadComplete.current &&
        localStorage.getItem("forceRefreshOnLoad")
      ) {
        logInfo("Detected forced refresh request on route change");

        // Reset the preload state
        preloadComplete.current = false;
        preloadStarted.current = false;

        // Remove the flag
        localStorage.removeItem("forceRefreshOnLoad");

        // Force screen to reload and show loading screen
        window.location.reload();
      }
    };

    // Listen for events that might indicate route change
    window.addEventListener("popstate", handleRouteChange);
    window.addEventListener("hashchange", handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
      window.removeEventListener("hashchange", handleRouteChange);
    };
  }, []);

  // Show loading screen while preloading
  if (isPreloading) {
    return (
      <LoadingScreen
        progress={loadingProgress}
        message={loadingMessage}
        details={loadingDetails}
      />
    );
  }

  // Once preloading is complete, render the application
  return children;
};

export default GlobalPreloader;
