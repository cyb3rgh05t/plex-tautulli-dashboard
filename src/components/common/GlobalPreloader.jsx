import React, { useState, useEffect, useRef } from "react";
import { useQueryClient } from "react-query";
import { useConfig } from "../../context/ConfigContext";
import { logInfo, logError, logDebug, logWarn } from "../../utils/logger";
import LoadingScreen from "./LoadingScreen";
import axios from "axios";
import * as tmdbService from "../../services/tmdbService";

/**
 * Enhanced GlobalPreloader that ensures ALL data is completely loaded
 * before showing the application UI, with TMDB poster preloading
 */
const GlobalPreloader = ({ children }) => {
  const { config, isConfigured, isLoading: configLoading } = useConfig();
  const queryClient = useQueryClient();
  const [isPreloading, setIsPreloading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState(
    "Initializing application..."
  );
  const [loadingDetails, setLoadingDetails] = useState("");
  const preloadStarted = useRef(false);
  const preloadComplete = useRef(false);

  // Track completion of individual loading tasks
  const loadingTasks = useRef({
    config: false,
    sections: false,
    media: false,
    activities: false,
    libraries: false,
    images: false,
    posters: false,
    metadata: false,
  });

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
        // Step 1: Check configuration
        setLoadingMessage("Checking configuration...");
        setLoadingDetails("Verifying Plex and Tautulli connections");
        setLoadingProgress(5);

        // If not configured, skip preloading and show setup wizard
        if (!isConfigured()) {
          logInfo("Application not configured, skipping preloading");
          setLoadingProgress(100);
          setIsPreloading(false);
          preloadComplete.current = true;
          return;
        }

        loadingTasks.current.config = true;
        setLoadingProgress(10);

        // Step 2: Load sections data - this is critical as everything depends on it
        setLoadingMessage("Loading library sections...");
        setLoadingDetails("Retrieving your Plex libraries");

        let sectionsData;
        try {
          const sectionsResponse = await axios.get("/api/sections");
          sectionsData = sectionsResponse.data;

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

        // Clear the poster cache to ensure fresh posters
        tmdbService.clearExpiredPosters();

        let loadedSections = 0;
        // Load each section sequentially to avoid overwhelming the server
        for (const sectionId of sectionIds) {
          try {
            setLoadingDetails(
              `Loading library ${loadedSections + 1} of ${sectionIds.length}`
            );

            // Find section name and type for better logging
            const section = allSections.find((s) => {
              const sectionData = s.raw_data || s;
              return sectionData.section_id === sectionId;
            });
            const sectionName =
              section?.raw_data?.name ||
              section?.name ||
              `Section ${sectionId}`;
            const sectionType =
              section?.raw_data?.type ||
              section?.raw_data?.section_type ||
              "unknown";

            // Load recently added media for this section
            const response = await axios.get(`/api/tautulli/api/v2`, {
              params: {
                apikey: config.tautulliApiKey,
                cmd: "get_recently_added",
                section_id: sectionId,
                count: 20, // Get extra items to ensure we have enough
              },
              timeout: 30000, // 30-second timeout for this critical operation
            });

            if (response.data?.response?.result === "success") {
              // Process media items
              const mediaItems = (
                response.data?.response?.data?.recently_added || []
              ).map((item) => ({
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
                            timeout: 10000,
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

                          // Try to get TMDB poster
                          try {
                            // Check if we have this poster cached already
                            let posterUrl = tmdbService.getCachedPosterUrl(
                              item.rating_key
                            );

                            if (!posterUrl) {
                              // Extract TMDB ID from guids
                              const mediaType = metadata.media_type
                                ? metadata.media_type.toLowerCase()
                                : "";

                              // Get poster based on media type
                              posterUrl =
                                await tmdbService.getPosterByMediaType(
                                  mediaType,
                                  metadata
                                );

                              // If we got a TMDB poster, cache it
                              if (posterUrl) {
                                tmdbService.cachePosterUrl(
                                  item.rating_key,
                                  posterUrl
                                );
                                enhancedItem.tmdb_poster_url = posterUrl;
                                logDebug(
                                  `✅ Cached TMDB poster for ${
                                    metadata.title || "unknown item"
                                  }`
                                );
                              }
                            } else {
                              enhancedItem.tmdb_poster_url = posterUrl;
                              logDebug(
                                `✅ Using cached TMDB poster for ${
                                  metadata.title || "unknown item"
                                }`
                              );
                            }
                          } catch (posterError) {
                            logWarn(
                              `Failed to get TMDB poster for ${metadata.title}:`,
                              posterError
                            );
                          }

                          // Store in query cache for fast access
                          queryClient.setQueryData(
                            [`media:${item.rating_key}`],
                            enhancedItem
                          );

                          // Store complete item in the section's cache as well
                          const currentSectionData = queryClient.getQueryData([
                            `section:${sectionId}`,
                          ]) || {
                            media: [],
                            section: section?.raw_data || section,
                          };

                          // Replace or add this item in the section cache
                          const existingItemIndex =
                            currentSectionData.media.findIndex(
                              (m) => m.rating_key === item.rating_key
                            );

                          if (existingItemIndex >= 0) {
                            currentSectionData.media[existingItemIndex] =
                              enhancedItem;
                          } else {
                            currentSectionData.media.push(enhancedItem);
                          }

                          // Update the section cache
                          queryClient.setQueryData(
                            [`section:${sectionId}`],
                            currentSectionData
                          );
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

                  // Small pause between batches to prevent overwhelming the server
                  await new Promise((resolve) => setTimeout(resolve, 200));
                }
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

        // Step 5: Final preparation - preload remaining critical images
        setLoadingMessage("Finalizing application...");
        setLoadingDetails("Preparing user interface");

        // Prepare data for monitoring recently added content
        window.plexDataTimestamps = {
          lastCheck: Date.now(),
          sections: Object.fromEntries(
            sectionIds.map((id) => [id, Date.now()])
          ),
        };

        // Complete loading
        setLoadingProgress(100);
        setLoadingMessage("Loading complete!");
        setLoadingDetails("");

        // Short delay before revealing UI for smooth transition
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Mark preloading as complete
        setIsPreloading(false);
        preloadComplete.current = true;
        logInfo("✅ Application preloading completed successfully");
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

  // Once preloading is complete, render the application
  return children;
};

export default GlobalPreloader;
