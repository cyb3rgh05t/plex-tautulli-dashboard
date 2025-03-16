import React, { useState, useEffect, useRef } from "react";
import { useQueryClient } from "react-query";
import { useConfig } from "../../context/ConfigContext";
import { logInfo, logError, logDebug, logWarn } from "../../utils/logger";
import LoadingScreen from "./LoadingScreen";
import axios from "axios";
import * as posterCacheService from "../../services/posterCacheService";

/**
 * Improved GlobalPreloader with simplified fast path determination
 * and more reliable data verification
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

  // Store key timestamps in localStorage
  const getLastPreloadTime = () => {
    return parseInt(localStorage.getItem("lastFullPreloadTime") || "0", 10);
  };

  const setLastPreloadTime = () => {
    localStorage.setItem("lastFullPreloadTime", Date.now().toString());
  };

  // Check if a full preload is needed based on multiple factors
  const isFullPreloadNeeded = async () => {
    // Always do a full preload if explicitly forced
    if (forceFullPreload.current) {
      logInfo("Full preload forced by application");
      return true;
    }

    // 1. Check if we have a valid configuration
    if (!isConfigured()) {
      logInfo("Application not configured, no preload needed");
      return false;
    }

    // 2. Check if config has changed
    const storedConfigHash = localStorage.getItem("configHash");
    const currentConfigHash = JSON.stringify(config);
    if (storedConfigHash !== currentConfigHash) {
      logInfo("Configuration has changed, full preload needed");
      return true;
    }

    // 3. Check if sections data is already available
    let sectionsData = null;
    try {
      // Try to get sections from query cache first
      sectionsData = queryClient.getQueryData(["sections"]);

      // If not in cache, try a quick API check
      if (!sectionsData) {
        const sectionsResponse = await axios.get("/api/sections", {
          timeout: 2000,
        });
        sectionsData = sectionsResponse.data;
        // Cache the sections data
        if (sectionsData?.sections?.length > 0) {
          queryClient.setQueryData(["sections"], sectionsData);
        }
      }

      // If no sections found, we need a full preload
      if (
        !sectionsData ||
        !sectionsData.sections ||
        sectionsData.sections.length === 0
      ) {
        logInfo("No sections data found, full preload needed");
        return true;
      }

      logInfo(`Found ${sectionsData.sections.length} sections in cache`);
    } catch (error) {
      logWarn("Error checking sections data:", error);
      return true; // If we can't verify sections, do a full preload to be safe
    }

    // Note: We've removed the 24-hour check to avoid forced reloads based on time
    // The preload will only happen when config changes or data is missing

    // 5. Try to verify that we have some media data cached
    try {
      // Get a sample section to check if we have media data
      const sectionId =
        sectionsData.sections[0]?.raw_data?.section_id ||
        sectionsData.sections[0]?.section_id;

      if (sectionId) {
        const sectionCache = queryClient.getQueryData([`section:${sectionId}`]);

        // If we have media data for this section, we can probably skip full preload
        if (
          sectionCache &&
          sectionCache.media &&
          sectionCache.media.length > 0
        ) {
          logInfo(
            "Found cached media data, quick preload should be sufficient"
          );
          return false;
        }
      }
    } catch (error) {
      logWarn("Error checking section media cache:", error);
      // Continue checking other indicators
    }

    // 6. Check if poster cache is empty without relying on the API
    // Instead, we'll use localStorage as an indicator
    const posterCacheIndicator = localStorage.getItem("posterCacheIndicator");
    if (posterCacheIndicator !== "populated") {
      logInfo("Poster cache indicator not found, full preload needed");
      return true;
    }

    // Default to quick preload if none of the above conditions trigger a full preload
    logInfo("All checks passed, quick preload should be sufficient");
    return false;
  };

  // Quick preload - just verify essential data availability
  const performQuickPreload = async () => {
    logInfo("Starting quick preload process");
    setLoadingMessage("Verifying application data...");
    setLoadingProgress(30);

    try {
      // 1. Verify sections data is available
      let sectionsData = queryClient.getQueryData(["sections"]);

      if (!sectionsData) {
        // Quick fetch of sections
        const sectionsResponse = await axios.get("/api/sections");
        sectionsData = sectionsResponse.data;

        // Cache the sections data
        if (sectionsData?.sections?.length > 0) {
          queryClient.setQueryData(["sections"], sectionsData);
        }
      }

      if (
        !sectionsData ||
        !sectionsData.sections ||
        sectionsData.sections.length === 0
      ) {
        logWarn(
          "No sections found during quick preload, switching to full preload"
        );
        forceFullPreload.current = true;
        return performFullPreload();
      }

      setLoadingProgress(50);
      setLoadingMessage("Loading essential data...");

      // 2. Get section IDs
      const sectionIds = sectionsData.sections
        .map((section) => {
          const sectionData = section.raw_data || section;
          return sectionData.section_id;
        })
        .filter(Boolean);

      // 3. Initialize media monitoring timestamps
      window.plexDataTimestamps = {
        lastCheck: Date.now(),
        sections: Object.fromEntries(sectionIds.map((id) => [id, Date.now()])),
      };

      // 4. Quick load of activities for the dashboard
      try {
        const activitiesResponse = await axios.get("/api/downloads");
        queryClient.setQueryData(
          ["plexActivities"],
          activitiesResponse.data.activities || []
        );
      } catch (error) {
        logWarn("Failed to load activities in quick preload:", error);
      }

      // 5. Load minimal libraries data
      try {
        const librariesResponse = await axios.get("/api/libraries");
        queryClient.setQueryData(["libraries"], librariesResponse.data);
      } catch (error) {
        logWarn("Failed to load libraries in quick preload:", error);
      }

      setLoadingProgress(100);
      setLoadingMessage("Application ready");
      logInfo("Quick preload completed successfully");

      // Brief delay for smooth transition
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Done preloading
      setIsPreloading(false);
      preloadComplete.current = true;
    } catch (error) {
      logError("Error during quick preload:", error);

      // If quick preload fails, try full preload
      logInfo("Quick preload failed, falling back to full preload");
      forceFullPreload.current = true;
      performFullPreload();
    }
  };

  // Full preloading - download all data, metadata, posters, etc.
  const performFullPreload = async () => {
    logInfo("Starting full preload process");
    setLoadingMessage("Starting data preload...");
    setLoadingDetails("This may take a few minutes");
    setLoadingProgress(5);

    try {
      // Step 1: Check configuration
      setLoadingMessage("Checking configuration...");
      setLoadingDetails("Verifying Plex and Tautulli connections");

      // If not configured, skip preloading
      if (!isConfigured()) {
        logInfo("Application not configured, skipping preload");
        setLoadingProgress(100);
        setIsPreloading(false);
        preloadComplete.current = true;
        return;
      }

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
          logInfo("No sections found, skipping media preload");
          setLoadingProgress(100);
          setIsPreloading(false);
          preloadComplete.current = true;
          return;
        }

        // Cache the sections data
        queryClient.setQueryData(["sections"], sectionsData);
        setLoadingProgress(20);
        logInfo(
          `Loaded ${sectionsData.sections?.length || 0} library sections`
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

          // Load recently added items for this section
          const response = await axios.get(`/api/tautulli/api/v2`, {
            params: {
              apikey: config.tautulliApiKey,
              cmd: "get_recently_added",
              section_id: sectionId,
              count: 10, // Limit to 10 items per section
            },
            timeout: 30000,
          });

          if (response.data?.response?.result === "success") {
            // Process media items
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

              // Create the section cache
              const sectionCache = {
                media: [],
                section: section?.raw_data || section,
              };

              // Process items in batches of 5
              const BATCH_SIZE = 5;
              for (let i = 0; i < mediaItems.length; i += BATCH_SIZE) {
                const batch = mediaItems.slice(i, i + BATCH_SIZE);

                // Process batch in parallel
                await Promise.all(
                  batch.map(async (item) => {
                    try {
                      // Fetch metadata
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

                        // Enhance item with metadata
                        const enhancedItem = {
                          ...item,
                          ...metadata,
                          complete_metadata: true,
                        };

                        // Cache poster
                        try {
                          // Get appropriate thumb path
                          const thumbPath =
                            posterCacheService.getAppropriateThumbPath(
                              enhancedItem
                            );

                          if (thumbPath) {
                            // Cache poster in background
                            posterCacheService.cachePoster(
                              item.rating_key,
                              thumbPath,
                              config.tautulliApiKey,
                              enhancedItem.media_type
                            );
                          }
                        } catch (posterError) {
                          logWarn(
                            `Failed to cache poster for ${metadata.title}:`,
                            posterError
                          );
                        }

                        // Store in query cache
                        queryClient.setQueryData(
                          [`media:${item.rating_key}`],
                          enhancedItem
                        );

                        // Add to section cache
                        sectionCache.media.push(enhancedItem);
                      }
                    } catch (itemError) {
                      logWarn(
                        `Failed to process item ${item.rating_key}:`,
                        itemError
                      );
                    }
                  })
                );

                // Update loading progress
                const sectionProgress = loadedSections / sectionIds.length;
                const itemProgress = (i + batch.length) / mediaItems.length;
                const combinedProgress =
                  20 +
                  Math.floor(
                    (sectionProgress + itemProgress / sectionIds.length) * 40
                  );

                setLoadingProgress(combinedProgress);
                setLoadingDetails(
                  `Processed ${i + batch.length}/${
                    mediaItems.length
                  } items in ${sectionName}`
                );

                // Small pause between batches
                await new Promise((resolve) => setTimeout(resolve, 100));
              }

              // Limit section cache to exactly 10 items
              if (sectionCache.media.length > 10) {
                sectionCache.media = sectionCache.media.slice(0, 10);
              }

              // Store section cache
              queryClient.setQueryData([`section:${sectionId}`], sectionCache);
            }
          }

          loadedSections++;
        } catch (sectionError) {
          logWarn(`Failed to process section ${sectionId}:`, sectionError);
        }
      }

      setLoadingProgress(60);

      // Step 4: Load other essential data
      setLoadingMessage("Loading application data...");
      setLoadingDetails("Getting activities and libraries");

      try {
        // Activities data
        const activitiesResponse = await axios.get("/api/downloads");
        queryClient.setQueryData(
          ["plexActivities"],
          activitiesResponse.data.activities || []
        );
        logInfo("✅ Loaded activities data");
      } catch (error) {
        logWarn("Failed to load activities:", error);
      }

      try {
        // Libraries data
        const librariesResponse = await axios.get("/api/libraries");
        queryClient.setQueryData(["libraries"], librariesResponse.data);
        logInfo("✅ Loaded libraries data");
      } catch (error) {
        logWarn("Failed to load libraries:", error);
      }

      setLoadingProgress(80);

      // Step 5: Final preparation
      setLoadingMessage("Finalizing application...");
      setLoadingDetails("Preparing user interface");

      // Set up data for monitoring
      window.plexDataTimestamps = {
        lastCheck: Date.now(),
        sections: Object.fromEntries(sectionIds.map((id) => [id, Date.now()])),
      };

      // Set poster cache indicator
      localStorage.setItem("posterCacheIndicator", "populated");

      // Store current config hash
      localStorage.setItem("configHash", JSON.stringify(config));

      // Update last preload time
      setLastPreloadTime();

      // Complete loading
      setLoadingProgress(100);
      setLoadingMessage("Loading complete!");
      setLoadingDetails("");

      // Short delay before showing UI
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Done preloading
      setIsPreloading(false);
      preloadComplete.current = true;
      logInfo("✅ Full preload completed successfully");
    } catch (error) {
      logError("❌ Error during full preload:", error);

      // Show error message
      setLoadingMessage("Error during loading");
      setLoadingDetails(error.message || "An unexpected error occurred");
      setLoadingProgress(100);

      // Continue after a delay
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

    // Start preloading process
    const runPreload = async () => {
      preloadStarted.current = true;
      setIsPreloading(true);

      try {
        // Check if app is configured
        if (!isConfigured()) {
          logInfo("Application not configured, skipping preload");
          setLoadingProgress(100);
          setIsPreloading(false);
          preloadComplete.current = true;
          return;
        }

        // Determine if we need a full preload
        const needsFullPreload = await isFullPreloadNeeded();

        if (needsFullPreload) {
          await performFullPreload();
        } else {
          await performQuickPreload();
        }
      } catch (error) {
        logError("Error during preload decision:", error);

        // Default to full preload on error
        try {
          await performFullPreload();
        } catch (fullPreloadError) {
          logError("Error during fallback full preload:", fullPreloadError);

          // Show error and continue
          setLoadingMessage("Error during loading");
          setLoadingDetails(
            fullPreloadError.message || "An unexpected error occurred"
          );
          setLoadingProgress(100);

          await new Promise((resolve) => setTimeout(resolve, 2000));
          setIsPreloading(false);
          preloadComplete.current = true;
        }
      }
    };

    // Start preloading
    runPreload();
  }, [queryClient, isConfigured, configLoading, config]);

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

  // Once preloading is complete, render children
  return children;
};

export default GlobalPreloader;
