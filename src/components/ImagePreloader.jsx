import React, { useEffect, useState } from "react";
import { useConfig } from "../context/ConfigContext";
import { useQuery } from "react-query";
import { logInfo, logError, logDebug } from "../utils/logger";

/**
 * A component that preloads images in the background
 * This component doesn't render anything visible - it works silently in the App
 */
const ImagePreloader = () => {
  const { config, isLoading: configLoading } = useConfig();
  const [loadedImages, setLoadedImages] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);

  // Only fetch sections when config is available
  const { data: sectionsData, isLoading: sectionsLoading } = useQuery(
    ["sections"],
    async () => {
      if (!config || !config.tautulliApiKey) {
        // Skip API call if config isn't available
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
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      refetchOnWindowFocus: false,
      // Only enable this query when config is loaded and has API key
      enabled: !configLoading && !!config && !!config.tautulliApiKey,
      retry: 1,
      onError: (err) => {
        logError("Error fetching sections:", err);
      },
    }
  );

  // Simple logging function
  const logProgress = (message) => {
    logInfo(`[ImagePreloader] ${message}`);
  };

  // The main preloading effect - only runs once configuration is ready
  useEffect(() => {
    // Skip if any of these conditions are true
    if (configLoading || !config || !config.tautulliApiKey) {
      logDebug("Config not ready yet, skipping preloading");
      return;
    }

    // Don't proceed if already preloading or no sections data
    if (isPreloading || sectionsLoading || !sectionsData) {
      return;
    }

    // Get sections and begin preloading
    const sections = sectionsData.sections || [];
    if (sections.length === 0) {
      logInfo("No sections found for preloading");
      return;
    }

    // Start the preloading process
    const preloadImages = async () => {
      setIsPreloading(true);
      setLoadedImages(0);
      let imagesToLoad = [];

      logProgress(`Starting to preload images for ${sections.length} sections`);

      try {
        // For each section, fetch a few media items to preload
        for (const section of sections) {
          try {
            // Get raw data if available
            const sectionData = section.raw_data || section;
            if (!sectionData.section_id) continue;

            logProgress(
              `Fetching media items for section ${sectionData.section_id}`
            );

            // Get recently added items for this section
            const response = await fetch(
              `/api/tautulli/api/v2?apikey=${config.tautulliApiKey}&cmd=get_recently_added&section_id=${sectionData.section_id}&count=5`
            );

            if (!response.ok) {
              throw new Error(
                `Error fetching section ${sectionData.section_id} data`
              );
            }

            const data = await response.json();
            const mediaItems = data.response?.data?.recently_added || [];

            // Start preloading each item's image
            mediaItems.forEach((item) => {
              // Figure out the correct thumbnail path based on media type
              let thumbPath;
              const mediaType = (item.media_type || "").toLowerCase();

              // Determine the appropriate thumbnail path
              switch (mediaType) {
                case "movie":
                  thumbPath = item.parent_thumb || item.thumb;
                  break;
                case "show":
                  thumbPath = item.parent_thumb || item.thumb;
                  break;
                case "episode":
                  thumbPath = item.grandparent_thumb || item.thumb;
                  break;
                case "season":
                  thumbPath = item.grandparent_thumb || item.thumb;
                  break;
                default:
                  thumbPath = item.thumb;
              }

              // Skip if no thumbnail path
              if (!thumbPath) return;

              // Create URL
              const imageUrl = `/api/tautulli/pms_image_proxy?img=${encodeURIComponent(
                thumbPath
              )}&apikey=${config.tautulliApiKey}`;

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
          logProgress("No images found to preload");
          setIsPreloading(false);
          return;
        }

        logProgress(`Beginning to preload ${imagesToLoad.length} images`);

        // Start loading images in parallel - but limit concurrency
        const preloadChunks = [];
        const chunkSize = 5; // Number of images to load at once

        for (let i = 0; i < imagesToLoad.length; i += chunkSize) {
          preloadChunks.push(imagesToLoad.slice(i, i + chunkSize));
        }

        for (const chunk of preloadChunks) {
          await Promise.all(
            chunk.map((imageInfo) => {
              return new Promise((resolve) => {
                const img = new Image();

                img.onload = () => {
                  setLoadedImages((prev) => prev + 1);
                  resolve(true);
                };

                img.onerror = () => {
                  logError(`Failed to preload image: ${imageInfo.title}`);
                  setLoadedImages((prev) => prev + 1);
                  resolve(false);
                };

                // Set src to start loading
                img.src = imageInfo.url;
              });
            })
          );
        }

        logProgress(`Finished preloading ${imagesToLoad.length} images`);
      } catch (error) {
        logError("Error during image preloading:", error);
      } finally {
        setIsPreloading(false);
      }
    };

    // Start the preloading process
    preloadImages();
  }, [config, configLoading, sectionsData, sectionsLoading, isPreloading]);

  // Progress reporting
  useEffect(() => {
    if (totalImages > 0 && loadedImages > 0) {
      const progressPercent = Math.round((loadedImages / totalImages) * 100);
      if (progressPercent % 25 === 0 || loadedImages === totalImages) {
        logProgress(
          `Image preloading progress: ${loadedImages}/${totalImages} (${progressPercent}%)`
        );
      }
    }
  }, [loadedImages, totalImages]);

  // This component doesn't render anything visible
  return null;
};

export default ImagePreloader;
