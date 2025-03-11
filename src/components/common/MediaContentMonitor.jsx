import React, { useEffect, useRef } from "react";
import { useQueryClient } from "react-query";
import { useConfig } from "../../context/ConfigContext";
import { logInfo, logDebug, logError } from "../../utils/logger";
import axios from "axios";
import toast from "react-hot-toast";
import * as tmdbService from "../../services/tmdbService";

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
              count: 5, // Just get the most recent items
            },
            timeout: 5000,
          });

          if (response.data?.response?.result === "success") {
            const recentItems =
              response.data?.response?.data?.recently_added || [];

            // Update the timestamp for this section
            timestamps.current.sections[sectionId] = Date.now();

            // If we have new items
            if (recentItems.length > 0) {
              const newestItem = recentItems[0];

              // If we don't have any cached data or this is newer than our cached data
              if (
                !cachedData ||
                !cachedData.media ||
                cachedData.media.length === 0
              ) {
                // We definitely need to update
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

              // Compare with cached newest item
              const cachedNewestItem = cachedData.media[0];

              // Check if this is really a new item
              if (newestItem.rating_key !== cachedNewestItem.rating_key) {
                newContentFound = true;
                newMediaItems.push({
                  ...newestItem,
                  apiKey: config.tautulliApiKey,
                  section_id: sectionId,
                  section_name: sectionName,
                  media_type: newestItem.media_type,
                });
                logInfo(
                  `New content detected in section "${sectionName}": ${newestItem.title}`
                );
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

      // If new content was found, invalidate queries and notify user
      if (newContentFound) {
        // Invalidate section queries
        for (const sectionId of sectionIds) {
          queryClient.invalidateQueries([`section:${sectionId}`]);
        }

        // Pre-cache TMDB posters for new media items
        if (newMediaItems.length > 0) {
          logInfo(
            `Pre-caching TMDB posters for ${newMediaItems.length} new items`
          );

          // For each new item, try to fetch metadata and get TMDB poster
          newMediaItems.forEach(async (item) => {
            try {
              // Fetch full metadata
              const metadataResponse = await axios.get(`/api/tautulli/api/v2`, {
                params: {
                  apikey: config.tautulliApiKey,
                  cmd: "get_metadata",
                  rating_key: item.rating_key,
                },
                timeout: 5000,
              });

              if (metadataResponse.data?.response?.result === "success") {
                const metadata = metadataResponse.data.response.data;

                // Use metadata to get TMDB poster
                const posterUrl = await tmdbService.getPosterByMediaType(
                  item.media_type?.toLowerCase() || "",
                  metadata
                );

                if (posterUrl) {
                  tmdbService.cachePosterUrl(item.rating_key, posterUrl);
                  logInfo(`Cached TMDB poster for new item: ${item.title}`);

                  // Update cached metadata
                  queryClient.setQueryData([`media:${item.rating_key}`], {
                    ...metadata,
                    tmdb_poster_url: posterUrl,
                    apiKey: config.tautulliApiKey,
                    complete_metadata: true,
                  });
                }
              }
            } catch (err) {
              logError(`Error pre-caching TMDB poster for ${item.title}:`, err);
            }
          });
        }

        // Show notification to user
        toast.success("New content has been added to your libraries!", {
          duration: 5000,
          icon: "🎬",
        });

        // Dispatch event to notify components
        window.dispatchEvent(new CustomEvent("newMediaDetected"));
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

  // Set up content checking interval
  useEffect(() => {
    if (!isConfigured()) return;

    // Initial check after 30 seconds (let the app load first)
    const initialCheckTimeout = setTimeout(() => {
      checkForNewContent();
    }, 30000);

    // Set up interval for checking every 5 minutes
    checkInterval.current = setInterval(() => {
      checkForNewContent();
    }, 5 * 60 * 1000); // 5 minutes

    // Set up interval to clean expired TMDB poster cache entries every hour
    const tmdbCacheCleanupInterval = setInterval(() => {
      tmdbService.clearExpiredPosters();
    }, 60 * 60 * 1000); // 60 minutes

    logInfo("✅ Media content monitor initialized (5 minute interval)");

    return () => {
      clearTimeout(initialCheckTimeout);
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
      clearInterval(tmdbCacheCleanupInterval);
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
