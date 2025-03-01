// with theme styling applied

import React, { useState, useEffect, useRef } from "react";
import { useConfig } from "../../context/ConfigContext";
import { logError } from "../../utils/logger";
import * as Icons from "lucide-react";
import ThemedCard from "../common/ThemedCard";
import ThemedButton from "../common/ThemedButton";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

const StatusDot = ({ state }) => {
  const isActive = state === "watching";
  return (
    <div className="flex items-center justify-center">
      <div
        className={`w-3 h-3 rounded-full ${
          isActive ? "bg-green-500" : "bg-gray-500"
        }`}
      />
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
              <Icons.PlayCircle size={14} />
              Last Played Media
            </div>
          </th>
          <th className="px-4 py-3 text-right bg-gray-800/50 border-b border-gray-700/50">
            <div className="flex items-center justify-end gap-2 text-theme-muted font-medium">
              <Icons.Play size={14} />
              Total Plays
            </div>
          </th>
          <th className="px-4 py-3 text-right bg-gray-800/50 border-b border-gray-700/50">
            <div className="flex items-center justify-end gap-2 text-theme-muted font-medium">
              <Icons.Timer size={14} />
              Last Played Duration
            </div>
          </th>
          <th className="px-4 py-3 text-left bg-gray-800/50 border-b border-gray-700/50">
            <div className="flex items-center gap-2 text-theme-muted font-medium">
              <Icons.Clock size={14} />
              Last Seen
            </div>
          </th>
          <th className="px-4 py-3 text-center bg-gray-800/50 rounded-tr-lg border-b border-gray-700/50">
            <span className="text-theme-muted font-medium">Status</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-700/50">
        {users.map((user) => {
          // Use raw_data for consistent information retrieval
          const userData = user.raw_data || user;
          return (
            <tr
              key={userData.user_id || Math.random()}
              className={`hover:bg-gray-800/30 transition-colors duration-200 ${
                userData.state === "watching" ? "bg-gray-800/20" : ""
              }`}
            >
              <td className="px-4 py-3 font-medium text-white">
                {userData.friendly_name || "Unknown User"}
              </td>
              <td className="px-4 py-3 text-theme">
                {userData.full_title || userData.title || "Nothing played yet"}
              </td>
              <td className="px-4 py-3 text-right text-accent-base font-medium">
                {userData.plays ? userData.plays.toLocaleString() : "0"}
              </td>
              <td className="px-4 py-3 text-right text-accent-base font-medium">
                {userData.formatted_duration || "0m"}
              </td>
              <td className="px-4 py-3">
                {userData.state === "watching" ? (
                  <span className="font-medium text-green-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Is Watching
                  </span>
                ) : (
                  <span className="text-theme">
                    {userData.last_seen_formatted || "Never"}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <StatusDot state={userData.state || "watched"} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const refreshInterval = useRef(null);
  const REFRESH_INTERVAL = 60000; // 60 seconds

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`);

      if (!response.ok) {
        throw new Error(`Failed to fetch users (Status: ${response.status})`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch users data");
      }

      // Sort users - active users first, then by last_seen time (most recent first)
      const sortedUsers = [...data.users].sort((a, b) => {
        // Get user data from raw_data if available, otherwise use the user object directly
        const userA = a.raw_data || a;
        const userB = b.raw_data || b;

        // First priority: Active users (is_watching/state is "watching")
        const isActiveA =
          userA.state === "watching" || userA.is_watching === "Watching";
        const isActiveB =
          userB.state === "watching" || userB.is_watching === "Watching";

        // If one is active and the other is not, the active one goes first
        if (isActiveA && !isActiveB) return -1;
        if (!isActiveA && isActiveB) return 1;

        // If both have same active status, sort by last_seen (most recent first)
        // Handle users with no last_seen (they go to the end)
        if (!userA.last_seen && !userB.last_seen) return 0;
        if (!userA.last_seen) return 1;
        if (!userB.last_seen) return -1;

        // Sort by timestamp (higher/more recent first)
        return userB.last_seen - userA.last_seen;
      });

      setUsers(sortedUsers);
      setError(null);
      setLastRefreshTime(Date.now());
    } catch (err) {
      const errorMessage = `Failed to load users: ${err.message}`;
      setError(errorMessage);
      logError(errorMessage, err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    // Prevent multiple refreshes happening at once
    if (isRefreshing) return;

    setIsRefreshing(true);
    await fetchUsers();
  };

  // Setup auto-refresh interval
  useEffect(() => {
    if (config.tautulliApiKey) {
      // Initial fetch
      fetchUsers();

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
    }
  }, [config.tautulliApiKey]);

  // Calculate time until next refresh
  const timeUntilNextRefresh = Math.max(
    0,
    REFRESH_INTERVAL - (Date.now() - lastRefreshTime)
  );
  const secondsUntilRefresh = Math.ceil(timeUntilNextRefresh / 1000);

  // Calculate pagination values
  const totalItems = users.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // If current page is higher than total pages (e.g. after refresh), reset to page 1
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Get current page items
  const currentUsers = users.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top of the component
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex justify-between items-center mb-6">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-800/50 rounded mb-2"></div>
            <div className="h-6 w-32 bg-gray-800/50 rounded"></div>
          </div>
          <div className="h-10 w-28 bg-gray-800/50 rounded"></div>
        </div>
        <ThemedCard>
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="w-1/4 h-6 bg-gray-800/50 rounded"></div>
                <div className="w-1/4 h-6 bg-gray-800/50 rounded"></div>
                <div className="w-1/6 h-6 bg-gray-800/50 rounded"></div>
                <div className="w-1/6 h-6 bg-gray-800/50 rounded"></div>
              </div>
            ))}
          </div>
        </ThemedCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-400">{error}</p>
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
                {users.length} Users
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
        <UsersTable users={currentUsers} />
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
