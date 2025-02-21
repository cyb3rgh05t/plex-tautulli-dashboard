import React, { useState, useEffect } from "react";
import { useConfig } from "../../context/ConfigContext";
import { logError } from "../../utils/logger";
import * as Icons from "lucide-react";

const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp * 1000);
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) {
    return `${diffSecs} second${diffSecs !== 1 ? "s" : ""} ago`;
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? "s" : ""} ago`;
  } else {
    return `${diffYears} year${diffYears !== 1 ? "s" : ""} ago`;
  }
};

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
            <div className="flex items-center gap-2 text-gray-400 font-medium">
              <Icons.Users size={14} />
              Username
            </div>
          </th>
          <th className="px-4 py-3 text-left bg-gray-800/50 border-b border-gray-700/50">
            <div className="flex items-center gap-2 text-gray-400 font-medium">
              <Icons.PlayCircle size={14} />
              Last Played Media
            </div>
          </th>
          <th className="px-4 py-3 text-right bg-gray-800/50 border-b border-gray-700/50">
            <div className="flex items-center justify-end gap-2 text-gray-400 font-medium">
              <Icons.Play size={14} />
              Total Plays
            </div>
          </th>
          <th className="px-4 py-3 text-right bg-gray-800/50 border-b border-gray-700/50">
            <div className="flex items-center justify-end gap-2 text-gray-400 font-medium">
              <Icons.Timer size={14} />
              Total Duration
            </div>
          </th>
          <th className="px-4 py-3 text-left bg-gray-800/50 border-b border-gray-700/50">
            <div className="flex items-center gap-2 text-gray-400 font-medium">
              <Icons.Clock size={14} />
              Last Seen
            </div>
          </th>
          <th className="px-4 py-3 text-center bg-gray-800/50 rounded-tr-lg border-b border-gray-700/50">
            <span className="text-gray-400 font-medium">Status</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-700/50">
        {users.map((user) => (
          <tr
            key={user.user_id}
            className="hover:bg-gray-800/30 transition-colors duration-200"
          >
            <td className="px-4 py-3 font-medium text-white">
              {user.friendly_name}
            </td>
            <td className="px-4 py-3 text-gray-300">
              {user.full_title || "Nothing played yet"}
            </td>
            <td className="px-4 py-3 text-right text-brand-primary-400 font-medium">
              {user.plays.toLocaleString()}
            </td>
            <td className="px-4 py-3 text-right text-brand-primary-400 font-medium">
              {Math.round(user.duration / 3600)} hrs
            </td>
            <td className="px-4 py-3 text-gray-300">
              {user.last_seen ? formatRelativeTime(user.last_seen) : "Never"}
            </td>
            <td className="px-4 py-3 text-center">
              <StatusDot state={user.state} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Users = () => {
  const { config } = useConfig();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await fetch("http://localhost:3006/api/users");

      if (!response.ok) {
        throw new Error(`Failed to fetch users (Status: ${response.status})`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch users data");
      }

      setUsers(data.users);
      setError(null);
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
    setIsRefreshing(true);
    await fetchUsers();
  };

  useEffect(() => {
    if (config.tautulliApiKey) {
      fetchUsers();
    }
  }, [config.tautulliApiKey]);

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
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50">
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
        </div>
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
              <Icons.Users size={14} className="text-brand-primary-400" />
              <span className="text-gray-400 text-sm">
                {users.length} Users
              </span>
            </div>
            {isRefreshing && (
              <span className="text-xs text-gray-500">Refreshing...</span>
            )}
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`px-4 py-2 rounded-lg bg-brand-primary-500/10 text-brand-primary-400 
            border border-brand-primary-500/20 hover:bg-brand-primary-500/20 
            transition-all duration-200 flex items-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Icons.RefreshCw
            size={16}
            className={`${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
        <UsersTable users={users} />
      </div>
    </div>
  );
};

export default Users;
