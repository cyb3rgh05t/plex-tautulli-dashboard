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
      className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-medium 
        bg-transparent border border-accent transition-theme relative group
        hover:bg-accent-light hover:shadow-accent"
    >
      <Icon
        className={`mr-1.5 ${
          isChecking ? "animate-pulse" : ""
        } text-accent group-hover:text-accent`}
        size={16}
      />
      <span className="text-accent group-hover:text-accent">
        {type === "plex" ? "Plex" : "Tautulli"}
      </span>

      {/* Status indicator dot */}
      <div className="relative ml-1.5">
        <div
          className={`w-2 h-2 rounded-full ${indicatorColor[status]} ${
            isChecking ? "animate-pulse" : ""
          } transition-all duration-300`}
        />
      </div>

      {/* Hover tooltip with detailed status */}
      <div
        className="absolute -bottom-14 left-1/2 transform -translate-x-1/2 hidden group-hover:block 
          bg-gray-800/90 border border-accent/20 text-white text-xs px-3 py-2 rounded-lg shadow-lg 
          whitespace-nowrap z-50 min-w-[120px] backdrop-blur-sm
          after:content-[''] after:absolute after:top-[-5px] after:left-1/2 after:ml-[-5px] 
          after:border-l-[5px] after:border-l-transparent after:border-r-[5px] after:border-r-transparent
          after:border-b-[5px] after:border-b-accent/20"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <StatusIcon
              size={12}
              className={`${
                status === "online"
                  ? "text-green-500"
                  : status === "offline"
                  ? "text-red-500"
                  : "text-yellow-500"
              }`}
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
            <span className="text-red-300 text-[10px] mt-1 border-t border-red-500/30 pt-1">
              {errorMessage}
            </span>
          )}
          {isChecking && (
            <span className="text-accent/70 text-[10px] flex items-center gap-1 animate-pulse">
              <CheckCircle size={10} /> Checking...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceStatusBadge;
