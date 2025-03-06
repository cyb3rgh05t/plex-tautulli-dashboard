import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  AlertCircle,
  Server,
  Database,
  AlertTriangle,
} from "lucide-react";
import axios from "axios";
import { logError, logInfo, logDebug, logWarn } from "../../utils/logger";

/**
 * A badge component that displays the connection status of a service
 *
 * @param {string} type - The type of service ('plex' or 'tautulli')
 * @param {string} url - The URL of the service (for display purposes)
 * @param {string} apiKey - The API key for Tautulli (not directly used)
 * @param {string} token - The token for Plex (not directly used)
 */
const ServiceStatusBadge = ({ type, url, apiKey, token }) => {
  const [status, setStatus] = useState("unknown"); // 'online', 'offline', 'unconfigured', 'unknown'
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const Icon = type === "plex" ? Server : Database;

  // Status indicator colors (keep these as red/green/yellow for clarity)
  const indicatorColor = {
    online: "bg-green-500",
    offline: "bg-red-500",
    unconfigured: "bg-yellow-500",
    unknown: "bg-gray-500",
  };

  // Text color - now using accent-base for all states
  const textColor = "text-accent-base";

  // Border and background - using accent color with opacity
  const bgColor = "bg-accent-light/20";
  const borderColor = "border-accent/30";

  const StatusIcon = {
    online: CheckCircle,
    offline: AlertCircle,
    unconfigured: AlertTriangle,
    unknown: AlertTriangle,
  }[status];

  // Check if the service is properly configured
  const isConfigured = () => {
    return (
      url && ((type === "plex" && token) || (type === "tautulli" && apiKey))
    );
  };

  // Check the connection status
  const checkStatus = async () => {
    if (!isConfigured() || isChecking) {
      setStatus("unconfigured");
      return;
    }

    setIsChecking(true);

    try {
      // Use our reliable server-side service check
      const response = await axios.post("/api/health/check-service", {
        service: type,
      });

      if (response.data) {
        setStatus(response.data.status || "unknown");
        setErrorMessage(response.data.error || response.data.message || "");
      } else {
        setStatus("unknown");
        setErrorMessage("Unknown response from server");
      }
    } catch (error) {
      logError(`Failed to check ${type} status:`, error);
      setStatus("offline");
      setErrorMessage(error.message || "Connection error");
    } finally {
      setIsChecking(false);
    }
  };

  // Initial check and periodic checks
  useEffect(() => {
    if (isConfigured()) {
      checkStatus();

      // Check every minute
      const interval = setInterval(() => {
        checkStatus();
      }, 60000);

      return () => clearInterval(interval);
    } else {
      setStatus("unconfigured");
    }
  }, [url, apiKey, token]);

  return (
    <div
      className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-medium 
        ${bgColor} ${borderColor} border transition-colors relative group hover:bg-accent-light/30`}
    >
      <Icon
        className={`mr-1.5 ${isChecking ? "animate-pulse" : ""} ${textColor}`}
        size={16}
      />
      <span className={textColor}>{type === "plex" ? "Plex" : "Tautulli"}</span>

      {/* Status indicator dot */}
      <div className="relative ml-1.5">
        <div
          className={`w-2 h-2 rounded-full ${indicatorColor[status]} ${
            isChecking ? "animate-pulse" : ""
          }`}
        />
      </div>

      {/* Hover tooltip with detailed status */}
      <div
        className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 hidden group-hover:block 
        bg-gray-800/90 border border-accent/20 text-white text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap z-50 min-w-[120px]"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${indicatorColor[status]}`}
            />
            <span>
              {status === "online"
                ? "Connected"
                : status === "offline"
                ? "Disconnected"
                : status === "unconfigured"
                ? "Not configured"
                : "Checking..."}
            </span>
          </div>
          {errorMessage && (
            <span className="text-red-300 text-[10px]">{errorMessage}</span>
          )}
          {isChecking && (
            <span className="text-gray-400 text-[10px]">Checking...</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceStatusBadge;
