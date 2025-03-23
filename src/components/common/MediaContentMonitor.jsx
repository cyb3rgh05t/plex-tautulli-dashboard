import React, { useEffect, useRef } from "react";
import { useQueryClient } from "react-query";
import { useConfig } from "../../context/ConfigContext";
import { logInfo, logDebug, logError } from "../../utils/logger";
import axios from "axios";
import toast from "react-hot-toast";
import * as posterCacheService from "../../services/posterCacheService";

/**
 * This component monitors for newly added media in the background.
 * It doesn't render anything but periodically checks for new content
 * and updates the cache automatically.
 */
const MediaContentMonitor = () => {
  const { config, isConfigured } = useConfig();
  const queryClient = useQueryClient();
  const checkInterval = useRef(null);
  const isChecking = useRef(false);

  // Timestamps to track the last time we checked each section
  const timestamps = useRef(
    window.plexDataTimestamps || {
      lastCheck: Date.now(),
      sections: {},
    }
  );

  // Keep track of already processed item rating keys to avoid duplicates
  const processedItems = useRef(new Set());

  // Function to check sections for new content
  const checkForNewContent = async () => {
    // Skip if already checking or not configured
    if (isChecking.current || !isConfigured() || !config?.tautulliApiKey) {
      return;
    }

    isChecking.current = true;
    let newContentFound = false;
    let newMediaItems = [];

    try {
      // Load sections
      const sectionsResponse = await axios.get("/api/sections");
      const allSections = sectionsResponse.data?.sections || [];

      // Get section IDs
      const sectionIds = allSections
        .map((section) => {
          const sectionData = section.raw_data || section;
          return sectionData.section_id;
        })
        .filter(Boolean);

      // For each section, check if there's new content
      for (const sectionId of sectionIds) {
        try {
          // Skip if we checked this section recently (within 2 minutes)
          const lastCheckTime = timestamps.current.sections[sectionId] || 0;
          const timeSinceLastCheck = Date.now() - lastCheckTime;

          // Check each section at most every 2 minutes
          if (timeSinceLastCheck < 2 * 60 * 1000) {
            continue;
          }

          // Find section name
          const section = allSections.find((s) => {
            const sectionData = s.raw_data || s;
            return sectionData.section_id === sectionId;
          });
          const sectionName =
            section?.raw_data?.name || section?.name || `Section ${sectionId}`;

          // Get current cached data
          const cachedData = queryClient.getQueryData([`section:${sectionId}`]);

          // Fetch the latest data for this section
          const response = await axios.get(`/api/tautulli/api/v2`, {
            params: {
              apikey: config.tautulliApiKey,
              cmd: "get_recently_added",
              section_id: sectionId,
              count: 10, // Get extra items to ensure we have enough
            },
            timeout: 5000,
          });

          if (response.data?.response?.result === "success") {
            const recentItems =
              response.data?.response?.data?.recently_added || [];

            // Update the timestamp for this section
            timestamps.current.sections[sectionId] = Date.now();

            // If we have new items, check for genuinely new content
            if (recentItems.length > 0) {
              const newestItem = recentItems[0];

              // If we don't have any cached data, everything is new
              if (
                !cachedData ||
                !cachedData.media ||
                cachedData.media.length === 0
              ) {
                newContentFound = true;
                newMediaItems.push({
                  ...newestItem,
                  apiKey: config.tautulliApiKey,
                  section_id: sectionId,
                  section_name: sectionName,
                  media_type: newestItem.media_type,
                });
                logInfo(`New content detected in section "${sectionName}"`);
                continue;
              }

              // Build a set of existing rating keys for faster lookup
              const existingRatingKeys = new Set(
                cachedData.media.map((item) => item.rating_key)
              );

              // Find truly new items by checking if they exist in the cache
              const genuinelyNewItems = recentItems.filter(
                (item) => !existingRatingKeys.has(item.rating_key)
              );

              // Only process items we haven't seen in this session
              const itemsToProcess = genuinelyNewItems.filter(
                (item) => !processedItems.current.has(item.rating_key)
              );

              // Add these to our processed set so we don't create duplicates
              itemsToProcess.forEach((item) => {
                processedItems.current.add(item.rating_key);
              });

              // If we found genuinely new items, add them to our list
              if (itemsToProcess.length > 0) {
                newContentFound = true;
                for (const newItem of itemsToProcess) {
                  newMediaItems.push({
                    ...newItem,
                    apiKey: config.tautulliApiKey,
                    section_id: sectionId,
                    section_name: sectionName,
                    media_type: newItem.media_type,
                  });
                  logInfo(
                    `New content detected in section "${sectionName}": ${newItem.title}`
                  );
                }
              }
            }
          }
        } catch (error) {
          logError(
            `Error checking section ${sectionId} for new content:`,
            error
          );
        }
      }

      // If new content was found, update cache and notify user
      if (newContentFound && newMediaItems.length > 0) {
        // Process each section that has new content
        for (const newItem of newMediaItems) {
          try {
            // Add section ID to the new item
            const sectionId = newItem.section_id;

            // Get the section cache
            const sectionCache = queryClient.getQueryData([
              `section:${sectionId}`,
            ]);

            if (sectionCache && sectionCache.media) {
              // IMPORTANT: Filter out any existing items with the same rating_key
              // to prevent duplicates
              const existingItems = sectionCache.media.filter(
                (item) => item.rating_key !== newItem.rating_key
              );

              // Create a new media array with the new item first, then the existing items (minus the last one)
              const updatedMedia = [
                // Add the new item with apiKey
                {
                  ...newItem,
                  apiKey: config.tautulliApiKey,
                },
                // Add all existing items except the last one, and filter out any duplicates
                ...existingItems.slice(0, -1),
              ];

              // Update the query cache with the new media array
              queryClient.setQueryData([`section:${sectionId}`], {
                ...sectionCache,
                media: updatedMedia,
              });

              logInfo(
                `Updated section ${sectionId} cache with new item ${newItem.title}`
              );
            } else {
              // If no section cache exists, just invalidate the query to force a refetch
              queryClient.invalidateQueries([`section:${sectionId}`]);
            }

            // Get full metadata for the new item
            const metadataResponse = await axios.get(`/api/tautulli/api/v2`, {
              params: {
                apikey: config.tautulliApiKey,
                cmd: "get_metadata",
                rating_key: newItem.rating_key,
              },
              timeout: 5000,
            });

            if (metadataResponse.data?.response?.result === "success") {
              const metadata = metadataResponse.data.response.data;

              // Cache the metadata
              queryClient.setQueryData([`media:${newItem.rating_key}`], {
                ...metadata,
                apiKey: config.tautulliApiKey,
                complete_metadata: true,
              });

              // Download poster to cache
              const thumbPath =
                posterCacheService.getAppropriateThumbPath(metadata);

              if (thumbPath) {
                // Cache the poster in the background
                posterCacheService.cachePoster(
                  newItem.rating_key,
                  thumbPath,
                  config.tautulliApiKey,
                  newItem.media_type
                );
              }
            }
          } catch (error) {
            logError(`Error processing new item ${newItem.title}:`, error);
          }
        }

        // Dispatch event to notify components - ensure this happens only once
        window.dispatchEvent(new CustomEvent("newMediaDetected"));

        // Show a toast notification to the user
        toast.success(
          `${newMediaItems.length} new items added to your library`,
          {
            duration: 5000,
          }
        );
      }

      // Update last check timestamp
      timestamps.current.lastCheck = Date.now();
      window.plexDataTimestamps = timestamps.current;
    } catch (error) {
      logError("Error checking for new content:", error);
    } finally {
      isChecking.current = false;
    }
  };

  // Set up content checking interval with optimized timing
  useEffect(() => {
    if (!isConfigured()) return;

    // Clear the processed items set when component mounts
    processedItems.current = new Set();

    // Stagger initial check to allow app to fully load first
    const initialCheckTimeout = setTimeout(() => {
      checkForNewContent();
    }, 45000); // 45 seconds

    // Set up interval for checking
    checkInterval.current = setInterval(() => {
      checkForNewContent();
    }, 5 * 60 * 1000); // 5 minutes

    // Clean up poster cache less frequently
    const posterCacheCleanupInterval = setInterval(() => {
      // Run cache cleanup in background
      axios.post("/api/posters/cache/cleanup").catch(() => {
        // Silently ignore errors during cleanup
      });
    }, 60 * 60 * 1000); // 60 minutes

    logInfo("✅ Media content monitor initialized");

    return () => {
      clearTimeout(initialCheckTimeout);
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
      clearInterval(posterCacheCleanupInterval);
    };
  }, [isConfigured]);

  // Listen for manual refresh requests
  useEffect(() => {
    const handleRefreshRequest = () => {
      logInfo("Manual refresh requested, checking for new content");
      checkForNewContent();
    };

    window.addEventListener("refreshMediaContent", handleRefreshRequest);

    return () => {
      window.removeEventListener("refreshMediaContent", handleRefreshRequest);
    };
  }, []);

  // This component doesn't render anything
  return null;
};

export default MediaContentMonitor;
