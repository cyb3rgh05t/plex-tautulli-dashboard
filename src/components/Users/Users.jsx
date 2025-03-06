import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "react-query";
import { useConfig } from "../../context/ConfigContext";
import { useTheme } from "../../context/ThemeContext";
import { useLocation } from "react-router-dom";
import { logError } from "../../utils/logger";
import * as Icons from "lucide-react";
import ThemedCard from "../common/ThemedCard";
import ThemedButton from "../common/ThemedButton";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

const ActivityBadge = ({ type }) => {
  // Map activity types to their visual styles
  const styles = {
    watching: {
      icon: Icons.Play,
      bg: "bg-green-500/10",
      text: "text-green-400",
      border: "border-green-500/20",
      label: "Watching",
    },
    watched: {
      icon: Icons.Clock,
      bg: "bg-gray-500/10",
      text: "text-gray-400",
      border: "border-gray-500/20",
      label: "Watched",
    },
    movie: {
      icon: Icons.Film,
      bg: "bg-brand-primary-500/10",
      text: "text-accent-base",
      border: "border-accent/20",
      label: "Movie",
    },
    episode: {
      icon: Icons.Tv,
      bg: "bg-brand-primary-500/10",
      text: "text-accent-base",
      border: "border-accent/20",
      label: "TV Show",
    },
  };

  // Safety check for undefined type
  const activityType = type ? type.toLowerCase() : "watched";

  // Use default style if type is not recognized
  const style = styles[activityType] || styles.watched;
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

const UsersTable = ({ users }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-separate border-spacing-0">
      <thead>
        <tr>
          <th className="px-4 py-3 text-left bg-gray-800/50 rounded-tl-lg border-b border-gray-700/50">
            <div className="flex items-center gap-2 text-theme-muted font-medium">
              <Icons.Users size={14} />
              Username
            </div>
          </th>
          <th className="px-4 py-3 text-left bg-gray-800/50 border-b border-gray-700/50">
            <div className="flex items-center gap-2 text-theme-muted font-medium">
              <Icons.Clock size={14} />
              Last Seen
            </div>
          </th>
          <th className="px-4 py-3 text-left bg-gray-800/50 border-b border-gray-700/50">
            <div className="flex items-center gap-2 text-theme-muted font-medium">
              <Icons.PlayCircle size={14} />
              Last Played Media
            </div>
          </th>
          <th className="px-4 py-3 text-left bg-gray-800/50 border-b border-gray-700/50">
            <div className="flex items-center gap-2 text-theme-muted font-medium">
              <Icons.Clock size={14} />
              Runtime Duration
            </div>
          </th>
          <th className="px-4 py-3 text-right bg-gray-800/50 border-b border-gray-700/50">
            <div className="flex items-center justify-end gap-2 text-theme-muted font-medium">
              <Icons.Play size={14} />
              Total Plays
            </div>
          </th>
          <th className="px-4 py-3 text-right bg-gray-800/50 rounded-tr-lg border-b border-gray-700/50">
            <div className="flex items-center justify-end gap-2 text-theme-muted font-medium">
              <Icons.Film size={14} />
              Type
            </div>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-700/50">
        {users.map((user, index) => {
          // Use raw_data for consistent information retrieval
          const userData = user.raw_data || user;
          const isWatching = userData.is_watching === "Watching";

          return (
            <tr
              key={userData.user_id || index}
              className={`hover:bg-gray-800/30 transition-colors duration-200 ${
                isWatching ? "bg-gray-800/20" : ""
              }`}
            >
              <td className="px-4 py-3 font-medium text-white">
                {userData.friendly_name || "Unknown User"}
              </td>
              <td className="px-4 py-3">
                {isWatching ? (
                  <span className="font-medium text-green-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Watching
                  </span>
                ) : (
                  <span className="text-theme">
                    {userData.last_seen_formatted || "Never"}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-theme max-w-[400px] truncate">
                {userData.last_played_modified ||
                  userData.last_played ||
                  "Nothing played yet"}
              </td>
              <td className="px-4 py-3 text-theme">
                {userData.formatted_duration ||
                  (userData.duration
                    ? `${Math.floor(userData.duration / 3600)}h ${Math.floor(
                        (userData.duration % 3600) / 60
                      )}m`
                    : "0m")}
              </td>
              <td className="px-4 py-3 text-right text-accent-base font-medium">
                {userData.plays ? userData.plays.toLocaleString() : "0"}
              </td>
              <td className="px-4 py-3 text-right">
                <ActivityBadge
                  type={
                    userData.media_type || (isWatching ? "watching" : "watched")
                  }
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* Header skeleton */}
    <div className="flex justify-between items-center">
      <div>
        <div className="h-8 w-48 bg-gray-800/50 rounded-lg mb-2"></div>
        <div className="h-6 w-32 bg-gray-800/50 rounded-lg"></div>
      </div>
      <div className="h-10 w-28 bg-gray-800/50 rounded-lg"></div>
    </div>

    {/* Table skeleton */}
    <div className="bg-gray-900/30 rounded-xl overflow-hidden border border-gray-800/50">
      {/* Table header */}
      <div className="h-14 bg-gray-800/50 border-b border-gray-700/50 px-4 flex items-center">
        <div className="flex-1 h-6 bg-gray-700/50 rounded-md"></div>
      </div>

      {/* Table rows */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-16 px-4 flex items-center border-b border-gray-800/30"
        >
          <div className="w-1/6 h-6 bg-gray-800/70 rounded-md mr-4"></div>
          <div className="w-1/6 h-6 bg-gray-800/70 rounded-md mr-4"></div>
          <div className="w-1/6 h-6 bg-gray-800/70 rounded-md mr-4"></div>
          <div className="w-1/6 h-6 bg-gray-800/70 rounded-md mr-4"></div>
          <div className="w-1/6 h-6 bg-gray-800/70 rounded-md mr-4"></div>
          <div className="w-1/6 h-6 bg-gray-800/70 rounded-md"></div>
        </div>
      ))}
    </div>

    {/* Pagination skeleton */}
    <div className="flex justify-center mt-6">
      <div className="flex gap-2">
        <div className="w-10 h-10 bg-gray-800/70 rounded-lg"></div>
        <div className="w-10 h-10 bg-gray-800/70 rounded-lg"></div>
        <div className="w-10 h-10 bg-gray-800/70 rounded-lg"></div>
      </div>
    </div>
  </div>
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

const Users = () => {
  const { config } = useConfig();
  const { theme } = useTheme();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const previousPath = useRef(null);
  const itemsPerPage = 10;
  const refreshInterval = useRef(null);
  const REFRESH_INTERVAL = 60000; // 60 seconds

  // Use React Query for data fetching with better loading state handling
  const { data, error, isLoading, isError, refetch } = useQuery(
    ["users", config.tautulliApiKey],
    async () => {
      const response = await fetch(`/api/users`);
      if (!response.ok) {
        throw new Error(`Error fetching users: ${response.statusText}`);
      }
      const data = await response.json();
      return data.users || [];
    },
    {
      enabled: !!config.tautulliApiKey,
      refetchInterval: false, // We'll handle manual refresh
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
    }
  );

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await refetch();
      setLastRefreshTime(Date.now());
    } catch (err) {
      logError("Failed to refresh users data", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check if navigated to this tab and trigger refresh
  useEffect(() => {
    if (
      previousPath.current !== location.pathname &&
      location.pathname === "/users"
    ) {
      handleRefresh();
    }
    previousPath.current = location.pathname;
  }, [location.pathname]);

  // Set up auto-refresh
  useEffect(() => {
    // Initial refresh
    if (config.tautulliApiKey) {
      handleRefresh();
    }

    // Set up interval for refresh
    refreshInterval.current = setInterval(() => {
      handleRefresh();
    }, REFRESH_INTERVAL);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [config.tautulliApiKey]);

  // Pagination calculations
  const totalItems = data?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Reset to page 1 if needed
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Get current page items
  const currentItems = data
    ? data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : [];

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculate time until next refresh
  const timeUntilNextRefresh = Math.max(
    0,
    REFRESH_INTERVAL - (Date.now() - lastRefreshTime)
  );
  const secondsUntilRefresh = Math.ceil(timeUntilNextRefresh / 1000);

  // If loading, show skeleton
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // If error, show error state
  if (isError) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-400">
          {error?.message || "Failed to load users"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Plex Users
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <Icons.Users size={14} className="text-accent-base" />
              <span className="text-theme-muted text-sm">
                {totalItems} Users
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

      <ThemedCard className="overflow-hidden">
        <UsersTable users={currentItems} />
      </ThemedCard>

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
          {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
          users
        </div>
      )}
    </div>
  );
};

export default Users;
