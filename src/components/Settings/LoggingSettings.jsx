import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import * as Icons from "lucide-react";
import ThemedButton from "../common/ThemedButton";
import ThemedTabButton from "../common/ThemedTabButton";
import ThemedCard from "../common/ThemedCard";
import { logError, logInfo, logDebug, logWarn } from "../../utils/logger";

const LoggingSettings = () => {
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
          // FIX: Add async to the setTimeout callback
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

  return (
    <ThemedCard
      title="Logging Settings"
      icon={Icons.FileText}
      useAccentBorder={true}
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
              {/* Log Source Selector */}
              <div>
                <label className="block text-theme font-medium mb-2">
                  Log Source
                </label>
                <div className="flex space-x-2">
                  <ThemedButton
                    onClick={() => handleSourceChange("client")}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      logSource === "client"
                        ? "bg-accent-base text-white"
                        : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    Client Logs
                  </ThemedButton>
                  <ThemedButton
                    onClick={() => handleSourceChange("server")}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      logSource === "server"
                        ? "bg-accent-base text-white"
                        : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    Server Logs
                  </ThemedButton>
                </div>
              </div>

              {/* Log Level Selector */}
              <div>
                <label className="block text-theme font-medium mb-2">
                  Log Level
                </label>
                <select
                  value={logLevel}
                  onChange={handleLogLevelChange}
                  className="bg-gray-900/50 border border-gray-700/50 rounded-lg px-4 py-2 text-white"
                >
                  {logLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                onClick={handleClearLogs}
                variant="acccent"
                icon={Icons.Trash2}
              >
                Clear Logs
              </ThemedButton>
              <ThemedButton
                onClick={handleDownloadLogs}
                variant="accent"
                icon={Icons.Download}
              >
                Download Logs
              </ThemedButton>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-lg font-medium text-white mb-2">
              {logSource === "server"
                ? "Server Log Viewer"
                : "Client Log Viewer"}
            </h4>
            <div className="bg-gray-900/80 border border-gray-700/50 rounded-lg p-4 h-80 overflow-y-auto font-mono text-sm">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className={`mb-1 ${
                      log.level === "error"
                        ? "text-red-400"
                        : log.level === "warn"
                        ? "text-yellow-400"
                        : log.level === "info"
                        ? "text-blue-400"
                        : "text-green-400"
                    }`}
                  >
                    <span className="text-gray-500">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    {" ["}
                    <span className="font-bold">{log.level.toUpperCase()}</span>
                    {"] "}
                    <span>{log.message}</span>
                    {log.error && (
                      <div className="pl-4 text-red-300">
                        Error: {log.error}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-gray-400 flex items-center justify-center h-full">
                  No logs to display
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Icons.Info size={16} className="text-accent-base" />
              <h4 className="text-white font-medium">About Logging</h4>
            </div>
            <p className="text-theme-muted mb-4">
              You can view and manage both client-side and server-side logs.
              Changing the log level affects the verbosity of logging. Server
              logs are stored in memory and will be cleared when the server
              restarts. Client logs will be cleared when you refresh the page.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="bg-gray-900/50 p-2 rounded flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-sm">ERROR - Critical issues</span>
              </div>
              <div className="bg-gray-900/50 p-2 rounded flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-yellow-500"></span>
                <span className="text-sm">WARN - Important alerts</span>
              </div>
              <div className="bg-gray-900/50 p-2 rounded flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-sm">INFO - Normal operations</span>
              </div>
              <div className="bg-gray-900/50 p-2 rounded flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-sm">DEBUG - Detailed tracing</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </ThemedCard>
  );
};

export default LoggingSettings;
