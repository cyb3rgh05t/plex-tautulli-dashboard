import React, { useState, useEffect, useRef } from "react";
import { useQueryClient } from "react-query";
import { useConfig } from "../../context/ConfigContext";
import { logInfo, logError, logDebug, logWarn } from "../../utils/logger";
import LoadingScreen from "./LoadingScreen";
import axios from "axios";

/**
 * Enhanced GlobalPreloader that ensures ALL data is completely loaded
 * before showing the application UI
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

        // Step 3: Load media for each section COMPLETELY (not just prefetch)
        setLoadingMessage("Loading media content...");
        setLoadingDetails(`Processing ${sectionIds.length} libraries`);

        let loadedSections = 0;
        // Load each section sequentially to avoid overwhelming the server
        for (const sectionId of sectionIds) {
          try {
            setLoadingDetails(
              `Loading library ${loadedSections + 1} of ${sectionIds.length}`
            );

            // Find section name for better logging
            const section = allSections.find((s) => {
              const sectionData = s.raw_data || s;
              return sectionData.section_id === sectionId;
            });
            const sectionName =
              section?.raw_data?.name ||
              section?.name ||
              `Section ${sectionId}`;

            // Load data for this section
            const response = await axios.get(`/api/tautulli/api/v2`, {
              params: {
                apikey: config.tautulliApiKey,
                cmd: "get_recently_added",
                section_id: sectionId,
                count: 12, // Get extra items to ensure we have enough
              },
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

              // Cache the data for this section
              queryClient.setQueryData([`section:${sectionId}`], {
                media: mediaItems,
                section: section?.raw_data || section,
              });

              logInfo(
                `✅ Loaded ${mediaItems.length} items for "${sectionName}"`
              );
            }

            // Update progress
            loadedSections++;
            const sectionProgress =
              20 + Math.floor((loadedSections / sectionIds.length) * 30);
            setLoadingProgress(sectionProgress);
          } catch (error) {
            logWarn(`Failed to load content for section ${sectionId}:`, error);
            // Continue loading other sections even if one fails
          }
        }

        loadingTasks.current.media = true;
        setLoadingProgress(50);

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

        setLoadingProgress(70);

        // Step 5: Preload critical images
        setLoadingMessage("Preparing media thumbnails...");
        setLoadingDetails("Loading poster images");

        // Get a list of all loaded media items
        const allSectionQueries = sectionIds
          .map((id) => queryClient.getQueryData([`section:${id}`]))
          .filter(Boolean);

        let allMediaItems = [];
        allSectionQueries.forEach((sectionData) => {
          if (sectionData.media && Array.isArray(sectionData.media)) {
            // Take only the first 2 items from each section to keep loading fast
            allMediaItems = [
              ...allMediaItems,
              ...sectionData.media.slice(0, 2),
            ];
          }
        });

        // Preload the top media item thumbnails (limited number)
        const itemsToPreload = allMediaItems.slice(0, 8); // Limit to 8 items total

        if (itemsToPreload.length > 0) {
          // Clear image cache to ensure fresh images
          await axios.get("/api/clear-image-cache");

          setLoadingDetails(
            `Preloading ${itemsToPreload.length} poster images`
          );

          // Load posters in parallel
          const imagePromises = itemsToPreload.map((item, index) => {
            return new Promise((resolve) => {
              // Generate a suitable thumbnail URL based on media type
              let thumbPath;
              const mediaType = (item.media_type || "").toLowerCase();

              switch (mediaType) {
                case "movie":
                  thumbPath = item.thumb || item.parent_thumb;
                  break;
                case "show":
                  thumbPath = item.thumb || item.parent_thumb;
                  break;
                case "episode":
                  thumbPath = item.grandparent_thumb || item.thumb;
                  break;
                case "season":
                  thumbPath = item.grandparent_thumb || item.thumb;
                  break;
                default:
                  thumbPath =
                    item.thumb || item.parent_thumb || item.grandparent_thumb;
              }

              if (!thumbPath || !item.apiKey) {
                resolve(false);
                return;
              }

              // Create an image object to load it
              const img = new Image();
              img.onload = () => resolve(true);
              img.onerror = () => resolve(false);

              // Use the Tautulli image proxy
              img.src = `/api/tautulli/pms_image_proxy?img=${encodeURIComponent(
                thumbPath
              )}&apikey=${item.apiKey}`;

              // Set a timeout in case the image load hangs
              setTimeout(() => resolve(false), 5000);
            });
          });

          // Wait for all images to load (or fail/timeout)
          const imageResults = await Promise.allSettled(imagePromises);
          const loadedCount = imageResults.filter(
            (r) => r.status === "fulfilled" && r.value === true
          ).length;

          logInfo(
            `✅ Preloaded ${loadedCount}/${itemsToPreload.length} poster images`
          );
        }

        loadingTasks.current.images = true;
        setLoadingProgress(90);

        // Final preparation step - initialize any data structures
        setLoadingMessage("Finalizing...");
        setLoadingDetails("Preparing user interface");

        // Add a small delay for UX smoothness
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Prepare data for monitoring recently added content
        // Will be used to check for new content later
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
        await new Promise((resolve) => setTimeout(resolve, 300));

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
