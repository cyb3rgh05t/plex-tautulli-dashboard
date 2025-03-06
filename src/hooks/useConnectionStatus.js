import { useState, useEffect } from "react";
import axios from "axios";
import { logError, logInfo, logDebug } from "../utils/logger";

/**
 * Custom hook to check and monitor the connection status of Plex and Tautulli services
 * @param {Object} config - The configuration object containing service URLs and credentials
 * @returns {Object} - Connection status information
 */
const useConnectionStatus = (config) => {
  const [plexStatus, setPlexStatus] = useState("unknown");
  const [tautulliStatus, setTautulliStatus] = useState("unknown");
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [error, setError] = useState(null);

  // Get service statuses from the dedicated endpoint
  const checkAllServices = async () => {
    if (isChecking) {
      return {
        plex: plexStatus,
        tautulli: tautulliStatus,
      };
    }

    setIsChecking(true);
    setError(null);

    try {
      // Use the dedicated dashboard health endpoint
      const response = await axios.get("/api/health?check=true");
      const data = response.data;

      // Update statuses based on response
      if (data.services) {
        // Update Plex status
        if (data.services.plex) {
          const newPlexStatus = !data.services.plex.configured
            ? "unconfigured"
            : data.services.plex.online
            ? "online"
            : "offline";
          setPlexStatus(newPlexStatus);
          logInfo("Plex service status updated", { status: newPlexStatus });
        }

        // Update Tautulli status
        if (data.services.tautulli) {
          const newTautulliStatus = !data.services.tautulli.configured
            ? "unconfigured"
            : data.services.tautulli.online
            ? "online"
            : "offline";
          setTautulliStatus(newTautulliStatus);
          logInfo("Tautulli service status updated", {
            status: newTautulliStatus,
          });
        }

        setLastChecked(new Date());
      } else {
        // If no services data, check individually
        logDebug("No services data in response, checking individually");
        await Promise.all([
          checkSingleService("plex"),
          checkSingleService("tautulli"),
        ]);
      }

      return {
        plex: plexStatus,
        tautulli: tautulliStatus,
      };
    } catch (error) {
      logError("Failed to check service statuses:", error);
      setError(error.message || "Failed to check services");

      // Check individually as fallback
      logInfo("Trying individual service checks as fallback");
      await Promise.all([
        checkSingleService("plex"),
        checkSingleService("tautulli"),
      ]);

      return {
        plex: plexStatus,
        tautulli: tautulliStatus,
      };
    } finally {
      setIsChecking(false);
    }
  };

  // Check a single service
  const checkSingleService = async (service) => {
    try {
      logDebug(`Checking ${service} service status`);
      const response = await axios.post("/api/health/check-service", {
        service,
      });

      if (response.data && response.data.status) {
        if (service === "plex") {
          setPlexStatus(response.data.status);
          logInfo("Plex service check result", {
            status: response.data.status,
          });
        } else {
          setTautulliStatus(response.data.status);
          logInfo("Tautulli service check result", {
            status: response.data.status,
          });
        }
      }
    } catch (error) {
      logError(`Error checking ${service} service:`, error);

      // Set to offline on error
      if (service === "plex") {
        setPlexStatus("offline");
      } else {
        setTautulliStatus("offline");
      }
    }
  };

  // Initial check and periodic checks
  useEffect(() => {
    // Only perform checks if we have at least one service configured
    const hasConfig = !!(
      (config?.plexUrl && config?.plexToken) ||
      (config?.tautulliUrl && config?.tautulliApiKey)
    );

    if (hasConfig) {
      logInfo("Configuration detected, checking service status");
      checkAllServices();

      // Check every minute
      const interval = setInterval(checkAllServices, 60000);
      logDebug("Set up status check interval (60s)");

      return () => {
        clearInterval(interval);
        logDebug("Cleared status check interval");
      };
    } else {
      // If no services are configured, set both to unconfigured
      logInfo("No configuration detected, marking services as unconfigured");
      setPlexStatus("unconfigured");
      setTautulliStatus("unconfigured");
    }
  }, [
    config?.plexUrl,
    config?.plexToken,
    config?.tautulliUrl,
    config?.tautulliApiKey,
  ]);

  return {
    plex: plexStatus,
    tautulli: tautulliStatus,
    isChecking,
    lastChecked,
    error,
    checkNow: checkAllServices,
  };
};

export default useConnectionStatus;
