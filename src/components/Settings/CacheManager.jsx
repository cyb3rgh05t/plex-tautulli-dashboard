import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import ThemedButton from "../../components/common/ThemedButton";
import ThemedCard from "../../components/common/ThemedCard";
import ThemedTabButton from "../../components/common/ThemedTabButton";
import { useTheme } from "../../context/ThemeContext";
import { logError, logInfo, logDebug, logWarn } from "../../utils/logger";
import * as posterCacheService from "../../services/posterCacheService";

// Enhanced cache stats card with theme integration
const CacheStatCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  accent = false,
}) => {
  const { accentRgb } = useTheme();

  return (
    <div
      className={`bg-gray-800/50 rounded-lg border ${
        accent ? "border-accent" : "border-gray-700/50"
      } p-4 transition-all duration-200 hover:bg-gray-800/70`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`p-2 rounded-full ${
            accent ? "bg-accent-light" : "bg-gray-700/50"
          }`}
        >
          <Icon
            size={16}
            className={accent ? "text-accent-base" : "text-gray-300"}
          />
        </div>
        <h4 className="text-white font-medium">{title}</h4>
      </div>
      <p
        className={`text-lg font-semibold ${
          accent ? "text-accent-base" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-theme-muted mt-1">{subtitle}</p>
    </div>
  );
};

const CacheManager = () => {
  const { accentColor, accentRgb } = useTheme();
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheStats, setCacheStats] = useState({
    history: { size: 0, label: "User History", ttl: "10 minutes" },
    media: { size: 0, label: "Recently Added", ttl: "5 minutes" },
    metadata: { size: 0, label: "Metadata", ttl: "30 minutes" },
    posters: { size: 0, label: "Media Posters", ttl: "Indefinite" },
    totalSize: 0,
    lastRefreshed: null,
    lastCleared: null,
  });

  // Fetch cache statistics when component mounts
  useEffect(() => {
    fetchCacheStats(false); // Don't show toast on initial load
  }, []);

  // Fetch cache statistics from various endpoints
  const fetchCacheStats = async (showToast = false) => {
    setRefreshing(true);
    try {
      // Establish counters for cache sizes
      let historyCacheSize = 0;
      let mediaCacheSize = 0;
      let metadataCacheSize = 0;
      let posterCacheSize = 0;
      let posterCacheSizeBytes = 0;

      // 1. Get user history cache stats from the users endpoint
      try {
        const usersResponse = await axios.get(`/api/users?count=1`);
        historyCacheSize = usersResponse.data?.cache?.total || 0;
      } catch (error) {
        logError("Failed to fetch user history cache stats:", error);
      }

      // 2. For media cache, try different media types
      try {
        // Try to get information about the media cache from multiple endpoints
        const mediaTypes = ["movies", "shows", "music"];
        let hasMediaCache = false;

        for (const type of mediaTypes) {
          try {
            // Add a cache-busting parameter to ensure we don't get a cached response
            const recentResponse = await axios.get(
              `/api/recent/${type}?count=1&_=${Date.now()}`
            );

            // Look for cache info markers in the response
            if (recentResponse.data?._cache?.hit) {
              hasMediaCache = true;
              // If we find evidence of a cached response, assume at least one entry
              mediaCacheSize += 1;
            }

            // Check for specific cache info in headers or response
            const cacheInfo =
              recentResponse.headers?.["x-cache-info"] ||
              recentResponse.data?._cache;

            if (cacheInfo) {
              logInfo(`Cache info for ${type}:`, cacheInfo);
            }
          } catch (err) {
            // Ignore errors on individual media type fetches
          }
        }

        // If we don't have definitive media cache info but know there's some caching
        // estimate based on movie types (conservative estimate)
        if (mediaCacheSize === 0) {
          // Estimate based on media types (likely to have at least 3 media types cached)
          mediaCacheSize = 3;
        }
      } catch (error) {
        logError("Failed to fetch media cache stats:", error);
      }

      // 3. For metadata cache, we can estimate based on typical usage patterns
      try {
        // Try to get an indirect indicator of metadata cache size from health endpoint
        const healthResponse = await axios.get(`/api/health?check=true`);

        // If there's explicit cache info, use it
        if (healthResponse.data?.cache?.metadata?.size) {
          metadataCacheSize = healthResponse.data.cache.metadata.size;
        } else {
          // Estimate based on typical usage:
          // Users who viewed content likely have metadata cached
          // Use a conservative estimate - there's typically more metadata cache than history
          metadataCacheSize = Math.max(5, historyCacheSize * 2);
        }
      } catch (error) {
        logError("Failed to fetch metadata cache stats:", error);
        // Fallback to a reasonable estimate
        metadataCacheSize = 10;
      }

      // 4. Get poster cache stats from the API
      try {
        const posterStatsResponse = await axios.get("/api/posters/cache/stats");
        // Check that the response has the required fields
        if (
          posterStatsResponse.data &&
          typeof posterStatsResponse.data.count !== "undefined"
        ) {
          posterCacheSize = posterStatsResponse.data.count || 0;
          posterCacheSizeBytes = posterStatsResponse.data.size || 0;
          logInfo(
            `Retrieved poster cache stats: ${posterCacheSize} posters (${
              posterStatsResponse.data.sizeFormatted || "0 Bytes"
            })`
          );
        } else {
          // Handle incomplete data
          logWarn(
            "Poster cache stats response incomplete:",
            posterStatsResponse.data
          );
          posterCacheSize = 0;
          posterCacheSizeBytes = 0;
        }
      } catch (error) {
        // Provide more details in the log
        logError("Failed to fetch poster cache stats:", {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        // Set default values
        posterCacheSize = 0;
        posterCacheSizeBytes = 0;

        // Check for specific error conditions
        if (error.response?.status === 500 && error.response?.data?.error) {
          logWarn(`Poster cache error details: ${error.response.data.error}`);

          // If directory issue, try to log the path
          if (error.response.data.directory) {
            logWarn(`Poster cache directory: ${error.response.data.directory}`);
          }
        }
      }

      // Update state with combined stats
      const totalSize =
        historyCacheSize + mediaCacheSize + metadataCacheSize + posterCacheSize;

      setCacheStats({
        history: {
          size: historyCacheSize,
          label: "User History",
          ttl: "10 minutes",
        },
        media: {
          size: mediaCacheSize,
          label: "Recently Added",
          ttl: "5 minutes",
        },
        metadata: {
          size: metadataCacheSize,
          label: "Metadata",
          ttl: "30 minutes",
        },
        posters: {
          size: posterCacheSize,
          label: "Media Posters",
          ttl: "Indefinite",
          sizeBytes: posterCacheSizeBytes,
          sizeFormatted: formatFileSize(posterCacheSizeBytes),
        },
        totalSize,
        lastRefreshed: new Date().toISOString(),
      });

      // Only show toast when explicitly requested (like manual refresh)
      if (showToast) {
        toast.success("Cache statistics refreshed");
      }
    } catch (error) {
      logError("Failed to fetch cache statistics:", error);
      toast.error("Failed to fetch cache statistics");
    } finally {
      setRefreshing(false);
    }
  };

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";

    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Clear cache using the proper API endpoints
  const clearCache = async (type = "all") => {
    setLoading(true);
    try {
      let response;
      let endpoint;

      // Use the appropriate endpoint based on cache type
      if (type === "all") {
        // Clear all caches
        endpoint = `/api/clear-cache`;
        response = await axios.post(endpoint);

        // Also clear poster cache
        await axios.post("/api/posters/cache/clear").catch((error) => {
          logWarn("Failed to clear poster cache:", error);
        });

        // Also clear image cache for all cache types
        await axios.get("/api/clear-image-cache").catch((error) => {
          logWarn("Failed to clear image cache:", error);
        });
      } else if (type === "history") {
        // Use the backward-compatible endpoint specifically for user history cache
        endpoint = `/api/users/clear-cache`;
        response = await axios.post(endpoint);
      } else if (type === "media") {
        // Use type-specific endpoint for media cache
        endpoint = `/api/clear-cache/${type}`;
        response = await axios.post(endpoint);

        // Also clear image cache when clearing media cache specifically
        await axios.get("/api/clear-image-cache").catch((error) => {
          logWarn("Failed to clear image cache for media cache:", error);
        });
      } else if (type === "posters") {
        // Clear poster cache
        response = await axios.post("/api/posters/cache/clear");
        // Set a successful response
        if (!response.data) {
          response = {
            data: { success: true, message: "Poster cache cleared" },
          };
        }
      } else {
        // Use type-specific endpoint for other cache types
        endpoint = `/api/clear-cache/${type}`;
        response = await axios.post(endpoint);
      }

      if (response.data && response.data.success) {
        // Update our local stats based on what was cleared
        if (type === "all") {
          setCacheStats((prev) => ({
            history: { ...prev.history, size: 0 },
            media: { ...prev.media, size: 0 },
            metadata: { ...prev.metadata, size: 0 },
            posters: {
              ...prev.posters,
              size: 0,
              sizeBytes: 0,
              sizeFormatted: "0 Bytes",
            },
            totalSize: 0,
            lastCleared: new Date().toISOString(),
            lastRefreshed: prev.lastRefreshed,
          }));

          // Dispatch event to notify components to refresh their image cache
          window.dispatchEvent(
            new CustomEvent("imageCacheCleared", {
              detail: { timestamp: Date.now() },
            })
          );
        } else if (type === "posters") {
          setCacheStats((prev) => {
            const newStats = { ...prev };
            newStats.posters.size = 0;
            newStats.posters.sizeBytes = 0;
            newStats.posters.sizeFormatted = "0 Bytes";
            newStats.totalSize =
              newStats.history.size +
              newStats.media.size +
              newStats.metadata.size;
            newStats.lastCleared = new Date().toISOString();
            return newStats;
          });

          // Invalidate poster cache URLs
          window.dispatchEvent(
            new CustomEvent("posterCacheCleared", {
              detail: { timestamp: Date.now() },
            })
          );
        } else if (type === "media") {
          setCacheStats((prev) => {
            const newStats = { ...prev };
            newStats[type].size = 0;
            newStats.totalSize =
              newStats.history.size +
              newStats.media.size +
              newStats.metadata.size +
              newStats.posters.size;
            newStats.lastCleared = new Date().toISOString();
            return newStats;
          });

          // Dispatch event to notify RecentlyAdded component to refresh image cache
          window.dispatchEvent(
            new CustomEvent("imageCacheCleared", {
              detail: { timestamp: Date.now(), type: "media" },
            })
          );
        } else {
          setCacheStats((prev) => {
            const newStats = { ...prev };
            newStats[type].size = 0;
            newStats.totalSize =
              newStats.history.size +
              newStats.media.size +
              newStats.metadata.size +
              newStats.posters.size;
            newStats.lastCleared = new Date().toISOString();
            return newStats;
          });
        }

        toast.success(response.data.message || "Cache cleared successfully");
      } else {
        throw new Error("Failed to clear cache");
      }
    } catch (error) {
      logError("Failed to clear cache:", error);
      toast.error(error.response?.data?.error || "Failed to clear cache");
    } finally {
      setLoading(false);
    }
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return "Never";

    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get the current active cache type details
  const getActiveCacheDetails = () => {
    if (activeTab === "all") {
      return {
        name: "All Caches",
        description: "Combined statistics for all cache types",
        size: cacheStats.totalSize,
        ttl: "Varies by type",
        icon: Icons.Database,
      };
    }

    const cacheData = cacheStats[activeTab];
    const cacheIcons = {
      history: Icons.Users,
      media: Icons.Film,
      metadata: Icons.FileText,
      posters: Icons.Image,
    };

    return {
      name: cacheData?.label || "Unknown",
      description: getCacheDescription(activeTab),
      size: cacheData?.size || 0,
      ttl: cacheData?.ttl || "Unknown",
      icon: cacheIcons[activeTab] || Icons.HelpCircle,
      sizeFormatted: cacheData?.sizeFormatted,
      sizeBytes: cacheData?.sizeBytes,
    };
  };

  // Get description based on cache type
  const getCacheDescription = (type) => {
    switch (type) {
      case "history":
        return "Stores user viewing history to reduce API calls";
      case "media":
        return "Caches recently added media lists to improve dashboard performance";
      case "metadata":
        return "Stores media metadata like resolution, quality, and other attributes";
      case "posters":
        return "Stores media posters locally for faster loading and reduced server load";
      default:
        return "Combined caching system for all data types";
    }
  };

  const activeCache = getActiveCacheDetails();

  return (
    <ThemedCard
      title="Cache Management"
      icon={Icons.Database}
      useAccentBorder={true}
      useAccentGradient={true}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-theme-muted text-sm">
            Manage application caches to optimize performance and ensure data
            freshness.
          </p>
          <ThemedButton
            onClick={() => fetchCacheStats(true)}
            variant="accent"
            size="sm"
            icon={
              refreshing
                ? () => <Icons.RefreshCw className="text-accent animate-spin" />
                : Icons.RefreshCw
            }
            disabled={refreshing}
            className="ml-auto"
            title="Refresh cache statistics"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </ThemedButton>
        </div>

        {/* Cache Type Tabs - Enhanced with ThemedTabButton */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-accent/30">
          <ThemedTabButton
            active={activeTab === "all"}
            onClick={() => setActiveTab("all")}
            icon={Icons.Database}
          >
            All Caches
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-accent-light/30 rounded-full">
              {cacheStats.totalSize}
            </span>
          </ThemedTabButton>

          <ThemedTabButton
            active={activeTab === "history"}
            onClick={() => setActiveTab("history")}
            icon={Icons.Users}
          >
            User History
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-accent-light/30 rounded-full">
              {cacheStats.history.size}
            </span>
          </ThemedTabButton>

          <ThemedTabButton
            active={activeTab === "media"}
            onClick={() => setActiveTab("media")}
            icon={Icons.Film}
          >
            Recently Added
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-accent-light/30 rounded-full">
              {cacheStats.media.size}
            </span>
          </ThemedTabButton>

          <ThemedTabButton
            active={activeTab === "metadata"}
            onClick={() => setActiveTab("metadata")}
            icon={Icons.FileText}
          >
            Metadata
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-accent-light/30 rounded-full">
              {cacheStats.metadata.size}
            </span>
          </ThemedTabButton>

          <ThemedTabButton
            active={activeTab === "posters"}
            onClick={() => setActiveTab("posters")}
            icon={Icons.Image}
          >
            Posters
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-accent-light/30 rounded-full">
              {cacheStats.posters.size}
            </span>
          </ThemedTabButton>
        </div>

        {/* Current Cache Information - Enhanced with accent color */}
        <div
          className="flex gap-6 items-center p-5 rounded-lg border border-accent transition-all duration-200"
          style={{
            background: `linear-gradient(135deg, rgba(${accentRgb}, 0.05) 0%, rgba(31, 41, 55, 0.6) 100%)`,
          }}
        >
          <div className="bg-accent-light/30 rounded-full p-4 transition-all duration-200">
            <activeCache.icon size={24} className="text-accent-base" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-white">
              {activeCache.name} Cache
            </h3>
            <p className="text-theme-muted text-sm">
              {activeCache.description}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-accent-base transition-all duration-200">
              {activeCache.size}
            </div>
            <div className="text-sm text-theme-muted">Items cached</div>
            {activeCache.sizeFormatted && (
              <div className="mt-1 text-xs text-accent-base/80">
                {activeCache.sizeFormatted}
              </div>
            )}
          </div>
        </div>

        {/* Cache Statistics - Enhanced with CacheStatCard component */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CacheStatCard
            icon={Icons.Clock}
            title="Cache TTL"
            value={activeCache.ttl}
            subtitle="Time until cache expires"
            accent={true}
          />

          <CacheStatCard
            icon={Icons.RefreshCw}
            title="Last Refreshed"
            value={formatDate(cacheStats.lastRefreshed)}
            subtitle="Stats last updated"
          />

          <CacheStatCard
            icon={Icons.Trash2}
            title="Last Cleared"
            value={formatDate(cacheStats.lastCleared)}
            subtitle="Manual cache clear"
          />
        </div>

        {/* Cache Management Actions - Enhanced with ThemedButton */}
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <ThemedButton
            onClick={() => clearCache(activeTab === "all" ? "all" : activeTab)}
            variant="danger"
            icon={loading ? Icons.Loader2 : Icons.Trash2}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading
              ? "Clearing..."
              : `Clear ${
                  activeTab === "all" ? "All Caches" : activeCache.name
                }`}
          </ThemedButton>

          <ThemedButton
            onClick={() => fetchCacheStats(true)}
            variant="ghost"
            icon={Icons.RefreshCw}
            disabled={refreshing}
            className="w-full sm:w-auto"
          >
            Refresh Stats
          </ThemedButton>

          <div className="ml-auto hidden sm:block">
            <ThemedButton
              onClick={() => window.location.reload()}
              variant="ghost"
              icon={Icons.RotateCw}
              className="w-full sm:w-auto"
              title="Reload the application to see changes"
            >
              Reload App
            </ThemedButton>
          </div>
        </div>

        {/* Detailed Information About Cache Types - Enhanced design with accent colors */}
        <div className="bg-accent-light/5 rounded-lg border border-accent/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-full bg-accent-light/20">
              <Icons.HelpCircle size={16} className="text-accent-base" />
            </div>
            <h4 className="text-white font-medium">About Caching System</h4>
          </div>

          <div className="space-y-3 text-sm text-theme-muted">
            <p>
              The dashboard uses multiple caching systems to improve
              performance:
            </p>

            {/* Cache type cards with accent colors */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
              <div className="bg-gray-800/40 border border-accent/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Icons.Users size={14} className="text-accent-base" />
                  <span className="text-white font-medium">
                    User History Cache
                  </span>
                </div>
                <p className="text-xs text-theme-muted">
                  Stores information about users' previously watched content
                </p>
                <div className="mt-2 text-xs text-accent-base">
                  TTL: 10 minutes
                </div>
              </div>

              <div className="bg-gray-800/40 border border-accent/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Icons.Film size={14} className="text-accent-base" />
                  <span className="text-white font-medium">Media Cache</span>
                </div>
                <p className="text-xs text-theme-muted">
                  Stores recently added media lists for movies, shows, and music
                </p>
                <div className="mt-2 text-xs text-accent-base">
                  TTL: 5 minutes
                </div>
              </div>

              <div className="bg-gray-800/40 border border-accent/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Icons.FileText size={14} className="text-accent-base" />
                  <span className="text-white font-medium">Metadata Cache</span>
                </div>
                <p className="text-xs text-theme-muted">
                  Stores media details like resolution, quality, codec, etc.
                </p>
                <div className="mt-2 text-xs text-accent-base">
                  TTL: 30 minutes
                </div>
              </div>

              <div className="bg-gray-800/40 border border-accent/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Icons.Image size={14} className="text-accent-base" />
                  <span className="text-white font-medium">Poster Cache</span>
                </div>
                <p className="text-xs text-theme-muted">
                  Stores media posters locally for faster loading and better
                  performance
                </p>
                <div className="mt-2 text-xs text-accent-base">
                  TTL: Indefinite
                </div>
              </div>
            </div>

            <p className="mt-3">
              Caches automatically expire after their TTL (Time To Live), but
              you can manually clear them to ensure the freshest data. Poster
              cache is stored permanently but unused posters are cleaned up
              automatically.
            </p>
          </div>
        </div>

        {/* Indicator for media cache actual API endpoints - Enhanced styling */}
        <div className="bg-accent-light/10 border border-accent/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Icons.Info size={16} className="text-accent-base mt-0.5" />
            <div className="text-sm text-theme-muted">
              <p className="mb-1">API endpoints used:</p>
              <div className="flex flex-wrap gap-2 mb-2">
                <code className="bg-gray-900/50 px-2 py-1 rounded text-accent-base font-mono text-xs inline-block border border-accent/10">
                  /api/clear-cache
                </code>
                <code className="bg-gray-900/50 px-2 py-1 rounded text-accent-base font-mono text-xs inline-block border border-accent/10">
                  /api/clear-image-cache
                </code>
                <code className="bg-gray-900/50 px-2 py-1 rounded text-accent-base font-mono text-xs inline-block border border-accent/10">
                  /api/posters/cache/clear
                </code>
                <code className="bg-gray-900/50 px-2 py-1 rounded text-accent-base font-mono text-xs inline-block border border-accent/10">
                  /api/users/clear-cache
                </code>
              </div>
              <p className="text-xs text-gray-400">
                Note: For media and metadata caches, the displayed counts are
                estimates since the API doesn't provide exact counts. History
                cache size is accurate. Poster cache is stored on the server and
                improves load times significantly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ThemedCard>
  );
};

export default CacheManager;
