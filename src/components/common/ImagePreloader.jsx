import React, { useEffect, useState, useRef } from "react";
import { useConfig } from "../../context/ConfigContext";
import { useQuery } from "react-query";
import { logInfo, logError, logDebug } from "../../utils/logger";

/**
 * Enhanced ImagePreloader component that preloads images in the background
 * Optimized for performance and more selective preloading
 */
const ImagePreloader = () => {
  const { config, isLoading: configLoading } = useConfig();
  const [loadedImages, setLoadedImages] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);
  const preloadCompleted = useRef(false);
  const preloadInProgressRef = useRef(false);

  // Only fetch sections when config is available
  const { data: sectionsData, isLoading: sectionsLoading } = useQuery(
    ["sections"],
    async () => {
      if (!config || !config.tautulliApiKey) {
        logDebug("No API key, skipping sections fetch");
        return { sections: [] };
      }

      try {
        const response = await fetch(`/api/sections`);
        if (!response.ok) throw new Error("Failed to load sections");
        return response.json();
      } catch (err) {
        logError("Error fetching sections in preloader:", err);
        return { sections: [] };
      }
    },
    {
      staleTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      enabled: !configLoading && !!config && !!config.tautulliApiKey,
      retry: 1,
    }
  );

  // Improved selective preloading with better concurrency control
  useEffect(() => {
    // Skip if any of these conditions are true
    if (
      configLoading ||
      !config ||
      !config.tautulliApiKey ||
      isPreloading ||
      sectionsLoading ||
      !sectionsData ||
      preloadCompleted.current ||
      preloadInProgressRef.current
    ) {
      return;
    }

    // Get sections and begin preloading
    const sections = sectionsData.sections || [];
    if (sections.length === 0) {
      logInfo("No sections found for preloading");
      return;
    }

    // Mark preloading as in progress
    preloadInProgressRef.current = true;

    // Start the preloading process with a small delay to let React finish UI rendering
    setTimeout(() => {
      const preloadImages = async () => {
        setIsPreloading(true);
        setLoadedImages(0);
        let imagesToLoad = [];

        logInfo(`Starting to preload images for ${sections.length} sections`);

        try {
          // Modified approach: only preload important sections
          // Choose only movie and show sections (skip music)
          const importantSections = sections.filter((section) => {
            const sectionData = section.raw_data || section;
            const sectionType = (
              sectionData.type ||
              sectionData.section_type ||
              ""
            ).toLowerCase();
            // Prioritize movie and show sections
            return sectionType === "movie" || sectionType === "show";
          });

          // Limit to max 3 sections to reduce initial load time
          const limitedSections = importantSections.slice(0, 3);

          logInfo(
            `Selected ${limitedSections.length} high-priority sections for preloading`
          );

          // For each section, fetch a few media items to preload
          for (const section of limitedSections) {
            try {
              // Get raw data if available
              const sectionData = section.raw_data || section;
              if (!sectionData.section_id) continue;

              // Get recently added items for this section - limit to fewer items
              const response = await fetch(
                `/api/tautulli/api/v2?apikey=${config.tautulliApiKey}&cmd=get_recently_added&section_id=${sectionData.section_id}&count=3`
              );

              if (!response.ok) {
                throw new Error(
                  `Error fetching section ${sectionData.section_id} data`
                );
              }

              const data = await response.json();
              const mediaItems = data.response?.data?.recently_added || [];

              // Add top items to preload queue
              mediaItems.forEach((item) => {
                let thumbPath;
                const mediaType = (item.media_type || "").toLowerCase();

                // Determine the appropriate thumbnail path
                switch (mediaType) {
                  case "movie":
                    thumbPath = item.parent_thumb || item.thumb;
                    break;
                  case "show":
                  case "episode":
                  case "season":
                    thumbPath = item.grandparent_thumb || item.thumb;
                    break;
                  default:
                    thumbPath = item.thumb;
                }

                // Skip if no thumbnail path
                if (!thumbPath) return;

                // Create URL with cache-busting timestamp
                const imageUrl = `/api/tautulli/pms_image_proxy?img=${encodeURIComponent(
                  thumbPath
                )}&apikey=${config.tautulliApiKey}&_t=${Date.now()}`;

                // Add to list of images to preload
                imagesToLoad.push({
                  url: imageUrl,
                  title: item.title || "Unknown",
                  section: sectionData.name || "Unknown",
                });
              });
            } catch (error) {
              logError(
                `Error processing section ${section.section_id || "unknown"}:`,
                error
              );
            }
          }

          // Set total images to load
          setTotalImages(imagesToLoad.length);

          if (imagesToLoad.length === 0) {
            logInfo("No images found to preload");
            setIsPreloading(false);
            preloadInProgressRef.current = false;
            return;
          }

          logInfo(
            `Beginning to preload ${imagesToLoad.length} priority images`
          );

          // Improved preloading with better concurrency control and error handling
          // Load images in parallel but with a limited concurrency
          const concurrencyLimit = 3; // Load max 3 images at once
          const activeLoads = new Set();
          let completedCount = 0;

          // Create a queue processor
          const processQueue = async () => {
            // Process the queue until empty
            while (
              imagesToLoad.length > 0 &&
              activeLoads.size < concurrencyLimit
            ) {
              const imageInfo = imagesToLoad.shift();

              // Skip if already at concurrency limit
              if (activeLoads.size >= concurrencyLimit) {
                imagesToLoad.unshift(imageInfo); // Put back at beginning of queue
                break;
              }

              // Create a promise for this image load
              const loadPromise = new Promise((resolve) => {
                const img = new Image();

                // Set load and error handlers
                img.onload = () => {
                  activeLoads.delete(loadPromise);
                  completedCount++;
                  setLoadedImages(completedCount);
                  resolve(true);
                  // Continue processing the queue
                  processQueue();
                };

                img.onerror = () => {
                  activeLoads.delete(loadPromise);
                  completedCount++;
                  setLoadedImages(completedCount);
                  resolve(false);
                  // Continue processing the queue
                  processQueue();
                };

                // Start loading
                img.src = imageInfo.url;

                // Add timeout to prevent stuck loads
                setTimeout(() => {
                  if (activeLoads.has(loadPromise)) {
                    activeLoads.delete(loadPromise);
                    completedCount++;
                    setLoadedImages(completedCount);
                    resolve(false);
                    processQueue();
                  }
                }, 5000); // 5 second timeout
              });

              // Add to active loads
              activeLoads.add(loadPromise);
            }

            // If queue is empty and no active loads, we're done
            if (imagesToLoad.length === 0 && activeLoads.size === 0) {
              logInfo(`Finished preloading ${completedCount} images`);
              setIsPreloading(false);
              preloadCompleted.current = true;
              preloadInProgressRef.current = false;
            }
          };

          // Start processing the queue
          processQueue();
        } catch (error) {
          logError("Error during image preloading:", error);
          setIsPreloading(false);
          preloadInProgressRef.current = false;
        }
      };

      // Start preloading
      preloadImages();
    }, 1000); // 1 second delay to prevent UI blocking
  }, [config, configLoading, sectionsData, sectionsLoading, isPreloading]);

  // Progress reporting - only log at 25% increments to reduce console spam
  useEffect(() => {
    if (totalImages > 0 && loadedImages > 0) {
      const progressPercent = Math.round((loadedImages / totalImages) * 100);
      if (progressPercent % 25 === 0 || loadedImages === totalImages) {
        logInfo(
          `Image preloading progress: ${loadedImages}/${totalImages} (${progressPercent}%)`
        );
      }
    }
  }, [loadedImages, totalImages]);

  // This component doesn't render anything visible
  return null;
};

export default ImagePreloader;
