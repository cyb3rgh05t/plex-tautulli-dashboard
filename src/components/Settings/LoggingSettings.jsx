import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import * as Icons from "lucide-react";
import ThemedButton from "../common/ThemedButton";
import ThemedTabButton from "../common/ThemedTabButton";
import ThemedCard from "../common/ThemedCard";
import { useTheme } from "../../context/ThemeContext";
import { logError, logInfo, logDebug, logWarn } from "../../utils/logger";

// Log level badge component using accent colors
const LogLevelBadge = ({ level }) => {
  const getBadgeStyles = () => {
    switch (level.toLowerCase()) {
      case "error":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "warn":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "info":
        return "bg-accent-light text-accent-base border-accent/30";
      case "debug":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${getBadgeStyles()}`}
    >
      {level.toUpperCase()}
    </div>
  );
};

const LoggingSettings = () => {
  const { accentColor, accentRgb } = useTheme();
  const [logLevel, setCurrentLogLevel] = useState("INFO");
  const [logs, setLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logSource, setLogSource] = useState("client"); // "client" or "server"

  // Available log levels
  const logLevels = ["ERROR", "WARN", "INFO", "DEBUG"];

  // Initial load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);

        // Fetch client-side log level first (this is synchronous)
        await fetchLogLevel();

        // Then fetch logs based on current source
        await refreshLogs();
      } catch (error) {
        logError("Error loading initial log data:", error);
        toast.error("Failed to load logging data");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Effect to refresh logs when log source changes
  useEffect(() => {
    refreshLogs();
  }, [logSource]);

  // Fetch log level
  const fetchLogLevel = async () => {
    if (logSource === "client") {
      // Client-side log level is handled directly
      try {
        const response = await axios.get("/api/logs/level");
        if (response.data.success) {
          setCurrentLogLevel(response.data.level);
        }
      } catch (error) {
        // Fallback to imported logger if API fails
        // This might happen during initial setup when server endpoints aren't ready
        setCurrentLogLevel("INFO");
      }
    } else {
      // Server-side log level comes from API
      try {
        const response = await axios.get("/api/logs/level");
        if (response.data.success) {
          setCurrentLogLevel(response.data.level);
        }
      } catch (error) {
        toast.error("Failed to fetch server log level");
      }
    }
  };

  // Refresh logs based on current source
  const refreshLogs = async () => {
    setRefreshing(true);

    try {
      if (logSource === "server") {
        // Fetch server logs from API
        const response = await axios.get("/api/logs");
        if (response.data.success) {
          setLogs(response.data.logs);
        } else {
          toast.error("Failed to fetch server logs");
        }
      } else {
        // Use client-side logs from imported logger
        // We make a short API call to ensure we get the latest client logs
        try {
          await axios.get("/api/health");

          // Short delay to make UI feel responsive
          setTimeout(async () => {
            // Now get client-side logs
            try {
              const response = await axios.get("/api/logs");
              if (response.data.success) {
                setLogs(response.data.logs);
              }
            } catch (err) {
              // If server API isn't ready, use empty array
              setLogs([]);
            }
            setRefreshing(false);
          }, 300);
          return; // Exit early due to setTimeout
        } catch (error) {
          // Fallback if API is not available
          setLogs([]);
        }
      }
    } catch (error) {
      logError("Error refreshing logs:", error);
      toast.error("Failed to refresh logs");
    } finally {
      setRefreshing(false);
    }
  };

  // Change log level
  const handleLogLevelChange = async (e) => {
    const newLevel = e.target.value;

    try {
      // Update log level via API
      const response = await axios.post("/api/logs/level", { level: newLevel });

      if (response.data.success) {
        setCurrentLogLevel(response.data.level);
        toast.success(`Log level changed to ${response.data.level}`);

        // Log the change locally too
        logInfo(`Log level changed to ${response.data.level}`);

        // Refresh logs
        refreshLogs();
      } else {
        toast.error("Failed to change log level");
      }
    } catch (error) {
      toast.error("Error changing log level");
      logError("Error changing log level:", error);
    }
  };

  // Clear logs
  const handleClearLogs = async () => {
    try {
      if (logSource === "server") {
        // Clear server logs via API
        const response = await axios.post("/api/logs/clear");
        if (response.data.success) {
          setLogs([]);
          toast.success("Server logs cleared");
        } else {
          toast.error("Failed to clear server logs");
        }
      } else {
        // Clear client logs via API
        const response = await axios.post("/api/logs/clear");
        if (response.data.success) {
          setLogs([]);
          toast.success("Client logs cleared");
        } else {
          toast.error("Failed to clear client logs");
        }
      }
    } catch (error) {
      toast.error(`Failed to clear ${logSource} logs`);
      logError("Error clearing logs:", error);
    }
  };

  // Download logs
  const handleDownloadLogs = () => {
    try {
      // Download logs as a file - this will trigger a file download
      window.open("/api/logs/download", "_blank");
      toast.success(
        `${logSource === "server" ? "Server" : "Client"} logs downloaded`
      );
    } catch (error) {
      toast.error("Failed to download logs");
      logError("Error downloading logs:", error);
    }
  };

  // Handle log source change
  const handleSourceChange = (source) => {
    setLogSource(source);
  };

  // Format log timestamp
  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch (error) {
      return "Invalid time";
    }
  };

  // Helper function to get log level icon
  const getLogLevelIcon = (level) => {
    switch (level.toLowerCase()) {
      case "error":
        return <Icons.AlertCircle size={14} className="text-red-400" />;
      case "warn":
        return <Icons.AlertTriangle size={14} className="text-yellow-400" />;
      case "info":
        return <Icons.Info size={14} className="text-accent-base" />;
      case "debug":
        return <Icons.Sparkles size={14} className="text-green-400" />;
      default:
        return <Icons.Circle size={14} className="text-gray-400" />;
    }
  };

  // Render log messages with appropriate styling based on level
  const renderLogMessage = (log, index) => {
    const getLogStyles = () => {
      switch (log.level.toLowerCase()) {
        case "error":
          return "text-red-400 border-l-2 border-red-500 pl-2";
        case "warn":
          return "text-yellow-400 border-l-2 border-yellow-500 pl-2";
        case "info":
          return "text-blue-400 border-l-2 border-accent pl-2";
        case "debug":
          return "text-green-400 border-l-2 border-green-500 pl-2";
        default:
          return "text-gray-400 border-l-2 border-gray-500 pl-2";
      }
    };

    return (
      <div key={index} className={`mb-1 ${getLogStyles()}`}>
        <div className="flex items-center gap-2">
          {getLogLevelIcon(log.level)}
          <span className="text-gray-500 text-xs">
            {formatTimestamp(log.timestamp)}
          </span>
          <LogLevelBadge level={log.level} />
          <span className="font-medium">{log.message}</span>
        </div>
        {log.error && (
          <div className="ml-6 mt-1 text-red-300 text-sm font-mono bg-red-900/20 p-1 rounded border border-red-500/20">
            {log.error}
          </div>
        )}
      </div>
    );
  };

  return (
    <ThemedCard
      title="Logging Settings"
      icon={Icons.FileText}
      useAccentBorder={true}
      useAccentGradient={true}
      className="p-6"
    >
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <Icons.Loader2 className="animate-spin h-8 w-8 text-accent-base" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
            <div className="space-y-4">
              {/* Log Source Selector - Enhanced with accent colors */}
              <div>
                <label className="block text-theme font-medium mb-2">
                  Log Source
                </label>
                <div className="flex space-x-2">
                  <ThemedTabButton
                    active={logSource === "client"}
                    onClick={() => handleSourceChange("client")}
                    icon={Icons.Laptop}
                  >
                    Client Logs
                  </ThemedTabButton>
                  <ThemedTabButton
                    active={logSource === "server"}
                    onClick={() => handleSourceChange("server")}
                    icon={Icons.Server}
                  >
                    Server Logs
                  </ThemedTabButton>
                </div>
              </div>

              {/* Log Level Selector - Enhanced with accent colors */}
              <div>
                <label className="block text-theme font-medium mb-2">
                  Log Level
                </label>
                <div className="relative">
                  <select
                    value={logLevel}
                    onChange={handleLogLevelChange}
                    className="appearance-none bg-gray-900/50 border border-accent rounded-lg pl-10 pr-10 py-2 text-white w-full focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                  >
                    {logLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Icons.Filter size={16} className="text-accent-base" />
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Icons.ChevronDown size={16} className="text-accent-base" />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <ThemedButton
                onClick={refreshLogs}
                variant="accent"
                icon={refreshing ? Icons.Loader2 : Icons.RefreshCw}
                disabled={refreshing}
              >
                Refresh
              </ThemedButton>
              <ThemedButton
                onClick={handleDownloadLogs}
                variant="accent"
                icon={Icons.Download}
              >
                Download Logs
              </ThemedButton>
              <ThemedButton
                onClick={handleClearLogs}
                variant="danger"
                icon={Icons.Trash2}
              >
                Clear Logs
              </ThemedButton>
            </div>
          </div>

          {/* Log Viewer - Enhanced with accent colors */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-medium text-white flex items-center gap-2">
                {logSource === "server" ? (
                  <>
                    <Icons.Server size={18} className="text-accent-base" />{" "}
                    Server Log Viewer
                  </>
                ) : (
                  <>
                    <Icons.Laptop size={18} className="text-accent-base" />{" "}
                    Client Log Viewer
                  </>
                )}
              </h4>
              <div className="px-3 py-1 bg-accent-light/20 rounded-full border border-accent/30 text-xs text-accent-base">
                {logs.length} Entries
              </div>
            </div>

            <div
              className="bg-gray-900/80 border border-accent rounded-lg p-4 h-80 overflow-y-auto font-mono text-sm custom-scrollbar"
              style={{
                boxShadow: `inset 0 2px 4px rgba(0,0,0,0.3), 0 0 0 1px rgba(${accentRgb}, 0.1)`,
              }}
            >
              {logs.length > 0 ? (
                logs.map((log, index) => renderLogMessage(log, index))
              ) : (
                <div className="text-gray-400 flex flex-col items-center justify-center h-full">
                  <Icons.FileX
                    size={24}
                    className="mb-2 text-accent-base opacity-50"
                  />
                  <span>No logs to display</span>
                </div>
              )}
            </div>
          </div>

          {/* Information Cards - Enhanced with accent colors */}
          <div className="bg-accent-light/5 rounded-lg p-4 border border-accent/20">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-full bg-accent-base/10">
                <Icons.Info size={16} className="text-accent-base" />
              </div>
              <h4 className="text-white font-medium">About Logging</h4>
            </div>
            <p className="text-theme-muted mb-4">
              You can view and manage both client-side and server-side logs.
              Changing the log level affects the verbosity of logging. Server
              logs are stored in memory and will be cleared when the server
              restarts. Client logs will be cleared when you refresh the page.
            </p>

            {/* Log Level Cards - Enhanced with accent colors */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="bg-red-900/10 border border-red-500/20 p-2 rounded-lg flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></span>
                <span className="text-sm">ERROR - Critical issues</span>
              </div>
              <div className="bg-yellow-900/10 border border-yellow-500/20 p-2 rounded-lg flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50"></span>
                <span className="text-sm">WARN - Important alerts</span>
              </div>
              <div className="bg-accent-light/10 border border-accent/20 p-2 rounded-lg flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full bg-accent-base shadow-sm"
                  style={{ boxShadow: `0 1px 2px rgba(${accentRgb}, 0.5)` }}
                ></span>
                <span className="text-sm">INFO - Normal operations</span>
              </div>
              <div className="bg-green-900/10 border border-green-500/20 p-2 rounded-lg flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></span>
                <span className="text-sm">DEBUG - Detailed tracing</span>
              </div>
            </div>
          </div>

          {/* Technical Information */}
          <div className="text-xs text-gray-500 border-t border-accent/10 pt-4">
            <p>
              Logs are preserved for the current session only. For persistent
              logging, use the Download feature.
            </p>
          </div>
        </div>
      )}
    </ThemedCard>
  );
};

export default LoggingSettings;
