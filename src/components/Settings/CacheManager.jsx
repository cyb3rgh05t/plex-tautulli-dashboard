import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import ThemedButton from "../common/ThemedButton";
import ThemedCard from "../common/ThemedCard";
import { logError, logInfo, logDebug, logWarn } from "../../utils/logger";

// Tab component for cache type selection
const CacheTypeTab = ({ active, onClick, label, icon: Icon, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
      active
        ? "bg-accent-light text-accent-base"
        : "text-theme-muted hover:text-theme-hover hover:bg-gray-700/50"
    }`}
  >
    <Icon size={16} />
    <span className="font-medium">{label}</span>
    {count !== undefined && (
      <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-800">
        {count}
      </span>
    )}
  </button>
);

const CacheManager = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheStats, setCacheStats] = useState({
    history: { size: 0, label: "User History", ttl: "10 minutes" },
    media: { size: 0, label: "Recently Added", ttl: "5 minutes" },
    metadata: { size: 0, label: "Metadata", ttl: "30 minutes" },
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

      // 1. Get user history cache stats from the users endpoint
      try {
        const usersResponse = await axios.get(`/api/users?count=1`);
        historyCacheSize = usersResponse.data?.cache?.total || 0;
      } catch (error) {
        logError("Failed to fetch user history cache stats:", error);
      }

      // 2. For media cache, try different media types (movies, shows, music)
      // as they're likely to be cached separately
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
      // Metadata is usually cached for each recently viewed item
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

      // Update state with combined stats
      const totalSize = historyCacheSize + mediaCacheSize + metadataCacheSize;

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
      } else if (type === "history") {
        // Use the backward-compatible endpoint specifically for user history cache
        endpoint = `/api/users/clear-cache`;
        response = await axios.post(endpoint);
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
            totalSize: 0,
            lastCleared: new Date().toISOString(),
            lastRefreshed: prev.lastRefreshed,
          }));
        } else {
          setCacheStats((prev) => {
            const newStats = { ...prev };
            newStats[type].size = 0;
            newStats.totalSize =
              newStats.history.size +
              newStats.media.size +
              newStats.metadata.size;
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
    };

    return {
      name: cacheData?.label || "Unknown",
      description: getCacheDescription(activeTab),
      size: cacheData?.size || 0,
      ttl: cacheData?.ttl || "Unknown",
      icon: cacheIcons[activeTab] || Icons.HelpCircle,
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
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-theme-muted text-sm">
            Manage application caches to optimize performance and ensure data
            freshness.
          </p>
          <ThemedButton
            onClick={() => fetchCacheStats(true)}
            variant="ghost"
            size="sm"
            icon={refreshing ? Icons.Loader2 : Icons.RefreshCw}
            disabled={refreshing}
            className="ml-auto"
            title="Refresh cache statistics"
          >
            Refresh
          </ThemedButton>
        </div>

        {/* Cache Type Tabs */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-700/50">
          <CacheTypeTab
            active={activeTab === "all"}
            onClick={() => setActiveTab("all")}
            label="All Caches"
            icon={Icons.Database}
            count={cacheStats.totalSize}
          />
          <CacheTypeTab
            active={activeTab === "history"}
            onClick={() => setActiveTab("history")}
            label="User History"
            icon={Icons.Users}
            count={cacheStats.history.size}
          />
          <CacheTypeTab
            active={activeTab === "media"}
            onClick={() => setActiveTab("media")}
            label="Recently Added"
            icon={Icons.Film}
            count={cacheStats.media.size}
          />
          <CacheTypeTab
            active={activeTab === "metadata"}
            onClick={() => setActiveTab("metadata")}
            label="Metadata"
            icon={Icons.FileText}
            count={cacheStats.metadata.size}
          />
        </div>

        {/* Current Cache Information */}
        <div className="flex gap-6 items-center p-5 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <div className="bg-gray-900/50 rounded-full p-4">
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
            <div className="text-2xl font-semibold text-accent-base">
              {activeCache.size}
            </div>
            <div className="text-sm text-theme-muted">Items cached</div>
          </div>
        </div>

        {/* Cache Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icons.Clock size={16} className="text-accent-base" />
              <h4 className="text-white font-medium">Cache TTL</h4>
            </div>
            <p className="text-lg font-semibold text-white">
              {activeCache.ttl}
            </p>
            <p className="text-xs text-theme-muted mt-1">
              Time until cache expires
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icons.RefreshCw size={16} className="text-green-500" />
              <h4 className="text-white font-medium">Last Refreshed</h4>
            </div>
            <p className="text-lg font-semibold text-white">
              {formatDate(cacheStats.lastRefreshed)}
            </p>
            <p className="text-xs text-theme-muted mt-1">Stats last updated</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icons.Trash2 size={16} className="text-red-400" />
              <h4 className="text-white font-medium">Last Cleared</h4>
            </div>
            <p className="text-lg font-semibold text-white">
              {formatDate(cacheStats.lastCleared)}
            </p>
            <p className="text-xs text-theme-muted mt-1">Manual cache clear</p>
          </div>
        </div>

        {/* Cache Management Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <ThemedButton
            onClick={() => clearCache(activeTab === "all" ? "all" : activeTab)}
            variant="warning"
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

        {/* Detailed Information About Cache Types */}
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 mt-2">
          <div className="flex items-center gap-2 mb-3">
            <Icons.HelpCircle size={16} className="text-accent-base" />
            <h4 className="text-white font-medium">About Caching System</h4>
          </div>

          <div className="space-y-3 text-sm text-theme-muted">
            <p>
              The dashboard uses three different caching systems to improve
              performance:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                <span className="text-white font-medium">
                  User History Cache (10m):
                </span>{" "}
                Stores information about users' previously watched content
              </li>
              <li>
                <span className="text-white font-medium">
                  Media Cache (5m):
                </span>{" "}
                Stores recently added media lists for movies, shows, and music
              </li>
              <li>
                <span className="text-white font-medium">
                  Metadata Cache (30m):
                </span>{" "}
                Stores media details like resolution, quality, codec, etc.
              </li>
            </ul>
            <p>
              Caches automatically expire after their TTL (Time To Live), but
              you can manually clear them to ensure the freshest data. Active
              users always bypass the cache to ensure real-time data.
            </p>
          </div>
        </div>

        {/* Indicator for media cache actual API endpoints */}
        <div className="bg-accent-light/10 border border-accent/20 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Icons.Info size={16} className="text-accent-base" />
            <div className="text-sm text-theme-muted">
              <p className="mb-1">
                This component uses the server's{" "}
                <code className="bg-gray-900/50 px-1 py-0.5 rounded text-accent-base font-mono">
                  /api/clear-cache
                </code>
                ,{" "}
                <code className="bg-gray-900/50 px-1 py-0.5 rounded text-accent-base font-mono">
                  /api/clear-cache/:type
                </code>
                , and{" "}
                <code className="bg-gray-900/50 px-1 py-0.5 rounded text-accent-base font-mono">
                  /api/users/clear-cache
                </code>{" "}
                endpoints for cache management.
              </p>
              <p className="text-xs text-gray-400">
                Note: For media and metadata caches, the displayed counts are
                estimates since the API doesn't provide exact counts. History
                cache size is accurate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ThemedCard>
  );
};

export default CacheManager;
