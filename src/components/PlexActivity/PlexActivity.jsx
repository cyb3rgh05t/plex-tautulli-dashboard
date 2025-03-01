// with theme styling applied

import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "react-query";
import { useConfig } from "../../context/ConfigContext";
import { useTheme } from "../../context/ThemeContext";
import { logError } from "../../utils/logger";
import * as Icons from "lucide-react";
import ThemedCard from "../common/ThemedCard";
import ThemedButton from "../common/ThemedButton";

const ActivityBadge = ({ type }) => {
  // Map activity types to their visual styles
  const styles = {
    download: {
      icon: Icons.Download,
      bg: "bg-brand-primary-500/10",
      text: "text-accent",
      border: "border-accent",
      label: "Downloading....",
    },
    transcode: {
      icon: Icons.Play,
      bg: "bg-brand-primary-500/10",
      text: "text-accent",
      border: "border-accent",
      label: "Transcoding...",
    },
    stream: {
      icon: Icons.Play,
      bg: "bg-brand-primary-500/10",
      text: "text-accent",
      border: "border-accent",
      label: "Streaming...",
    },
    pause: {
      icon: Icons.Pause,
      bg: "bg-brand-primary-500/10",
      text: "text-accent",
      border: "border-accent",
      label: "Paused",
    },
  };

  // Safety check for undefined type
  const activityType = type ? type.toLowerCase() : "download";

  // Use default style if type is not recognized
  const style = styles[activityType] || styles.download;
  const Icon = style.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border
        ${style.bg} ${style.text} ${style.border}`}
    >
      <Icon size={14} />
      <span className="text-xs font-medium">{style.label}</span>
    </div>
  );
};

const ProgressBar = ({ progress }) => {
  // Ensure progress is a number and capped at 100
  const percent = typeof progress === "number" ? Math.min(progress, 100) : 0;

  return (
    <div className="space-y-1">
      <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent-base to-accent-hover 
            rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-end">
        <span className="text-xs font-medium text-theme-muted">
          {percent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

const ActivityItem = ({ activity }) => {
  // Add a safety check for activity to prevent errors
  if (!activity || typeof activity !== "object") {
    return null;
  }

  return (
    <ThemedCard className="hover:bg-gray-800/50" isInteractive>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">
              {activity.subtitle || "Unknown"}
            </h3>
            <p className="text-theme-muted text-sm truncate">
              {activity.title || "Unknown"}
            </p>
          </div>
          <ActivityBadge type={activity.type} />
        </div>

        <ProgressBar progress={activity.progress} />
      </div>
    </ThemedCard>
  );
};

const LoadingItem = () => (
  <ThemedCard>
    <div className="space-y-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-gray-700/50 rounded w-2/3" />
          <div className="h-4 bg-gray-700/50 rounded w-1/2" />
        </div>
        <div className="h-6 w-24 bg-gray-700/50 rounded-full" />
      </div>
      <div className="h-2 bg-gray-700/50 rounded-full" />
    </div>
  </ThemedCard>
);

// Pagination component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-gray-700/50 bg-gray-800/50 text-theme-muted 
          hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Icons.ChevronLeft size={16} />
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors
              ${
                currentPage === page
                  ? "bg-accent-base text-white"
                  : "bg-gray-800/50 text-theme-muted hover:bg-gray-700 hover:text-white border border-gray-700/50"
              }`}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-gray-700/50 bg-gray-800/50 text-theme-muted 
          hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Icons.ChevronRight size={16} />
      </button>
    </div>
  );
};

const PlexActivity = () => {
  const { config } = useConfig();
  const { theme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const refreshInterval = useRef(null);
  const REFRESH_INTERVAL = 30000; // 30 seconds in milliseconds - shorter interval for downloads

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchActivities = async () => {
    try {
      const response = await fetch("/api/downloads");
      const data = await response.json();

      if (data.error) throw new Error(data.message || data.error);

      // Ensure activities is an array and process each item to include all required properties
      const processedActivities = (data.activities || []).map((item) => {
        // Extract raw_data if available in the new format
        const rawData = item.raw_data || item;

        return {
          uuid: rawData.uuid || `id-${Math.random().toString(36).substr(2, 9)}`,
          title: rawData.title || "Unknown",
          subtitle: rawData.subtitle || "Unknown",
          progress: typeof rawData.progress === "number" ? rawData.progress : 0,
          type: rawData.type || "download",
          ...item, // Include any custom formats from the top level
        };
      });

      return processedActivities;
    } catch (error) {
      console.error("Error fetching Plex activities:", error);
      throw error;
    }
  };

  const {
    data: activities,
    isLoading,
    error,
    refetch,
  } = useQuery(["plexActivities", config.plexToken], fetchActivities, {
    enabled: !!config.plexToken,
    refetchInterval: false, // We'll handle manual refresh
    refetchOnWindowFocus: false,
    staleTime: 10000, // 10 seconds
  });

  const handleRefresh = async () => {
    // Prevent multiple refreshes happening at once
    if (isRefreshing) return;

    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    setLastRefreshTime(Date.now());
  };

  // Listen for theme changes
  useEffect(() => {
    // Trigger reflow to ensure styles are updated
    document.body.style.display = "none";
    void document.body.offsetHeight;
    document.body.style.display = "";
  }, [theme]);

  // Setup auto-refresh interval on component mount
  useEffect(() => {
    // Set initial refresh time
    setLastRefreshTime(Date.now());

    // Setup interval for auto-refresh
    refreshInterval.current = setInterval(() => {
      handleRefresh();
    }, REFRESH_INTERVAL);

    // Cleanup interval on unmount
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  // Calculate time until next refresh
  const timeUntilNextRefresh = Math.max(
    0,
    REFRESH_INTERVAL - (Date.now() - lastRefreshTime)
  );
  const secondsUntilRefresh = Math.ceil(timeUntilNextRefresh / 1000);

  // Calculate pagination values
  const totalItems = activities?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // If current page is higher than total pages (e.g. after refresh), reset to page 1
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Get current page items
  const currentItems = activities
    ? activities.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : [];

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top of the component
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Sync Activities
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <Icons.Download size={14} className="text-accent-base" />
              <span className="text-theme-muted text-sm">
                {activities?.length || 0} Active
              </span>
            </div>
            {isRefreshing ? (
              <span className="text-xs text-theme-muted">Refreshing...</span>
            ) : (
              <span className="text-xs text-theme-muted">
                Auto-refresh in {secondsUntilRefresh}s
              </span>
            )}
          </div>
        </div>

        <ThemedButton
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="accent"
          icon={
            isRefreshing
              ? () => <Icons.RefreshCw className="animate-spin" />
              : Icons.RefreshCw
          }
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </ThemedButton>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <>
            <LoadingItem />
            <LoadingItem />
            <LoadingItem />
          </>
        ) : error ? (
          <ThemedCard className="bg-red-500/10 border-red-500/20 text-center">
            <p className="text-red-400">Failed to load Plex activities</p>
          </ThemedCard>
        ) : !activities?.length ? (
          <ThemedCard className="text-center py-8">
            <Icons.Download
              size={24}
              className="text-theme-muted mx-auto mb-3"
            />
            <p className="text-theme-muted">No active downloads</p>
          </ThemedCard>
        ) : (
          <>
            {/* Current page items */}
            {currentItems.map((activity) => (
              <ActivityItem
                key={activity.uuid || `activity-${Math.random()}`}
                activity={activity}
              />
            ))}

            {/* Pagination controls */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}

            {/* Page indicator */}
            {totalPages > 1 && (
              <div className="text-center text-sm text-theme-muted">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                {totalItems} activities
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PlexActivity;
