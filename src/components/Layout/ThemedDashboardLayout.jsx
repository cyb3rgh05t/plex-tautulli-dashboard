import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useConfig } from "../../context/ConfigContext";
import ThemedNavbar from "./ThemedNavbar";
import ThemedTabBar from "./ThemedTabBar";
import ThemeToggleFooter from "./ThemedToggleFooter";
import * as Icons from "lucide-react";
import { appVersion } from "../../../scripts/release.js";
import axios from "axios";
import { logError, logInfo, logDebug, logWarn } from "../../utils/logger";

const displayVersion = `v${appVersion}${
  process.env.NODE_ENV === "development" ? "-dev" : ""
}`;

/**
 * Status indicator component for the footer
 */
const ConnectionStatusIndicator = ({ status, service }) => {
  // Status indicator colors - keeping these as red/green/yellow for clarity
  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "offline":
        return "bg-red-500";
      case "unconfigured":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "online":
        return "Connected";
      case "offline":
        return "Disconnected";
      case "unconfigured":
        return "Not Configured";
      default:
        return "Checking...";
    }
  };

  const Icon = service === "plex" ? Icons.Server : Icons.Database;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <div className="w-5 h-5 flex items-center justify-center rounded-full bg-accent-light/30 border border-accent/20">
        <Icon size={12} className="text-accent-base" />
      </div>
      <span className="text-accent-base font-medium">
        {service === "plex" ? "Plex" : "Tautulli"}:
      </span>
      <div className="flex items-center gap-1">
        <div
          className={`w-1.5 h-1.5 rounded-full ${getStatusColor(status)}`}
        ></div>
        <span className="text-gray-200">{getStatusText(status)}</span>
      </div>
    </div>
  );
};

/**
 * The main dashboard layout with themed components that respond to accent color changes
 */
const ThemedDashboardLayout = () => {
  const { accentColor, accentRgb, themeName } = useTheme();
  const { config } = useConfig();

  // Create state variables directly in this component instead of using useConnectionStatus
  const [plex, setPlex] = useState("unknown");
  const [tautulli, setTautulli] = useState("unknown");
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [showStatusDetails, setShowStatusDetails] = useState(false);

  // Check service status
  const checkServiceStatus = async (service) => {
    if (!config) return "unconfigured";

    try {
      // Check configuration
      if (service === "plex") {
        if (!config.plexUrl || !config.plexToken) return "unconfigured";

        // Check Plex connection
        const response = await axios.post(
          "/api/health/check-service",
          {
            service: "plex",
          },
          { timeout: 10000 }
        );

        return response.data?.status || "unknown";
      } else if (service === "tautulli") {
        if (!config.tautulliUrl || !config.tautulliApiKey)
          return "unconfigured";

        // Check Tautulli connection
        const response = await axios.post(
          "/api/health/check-service",
          {
            service: "tautulli",
          },
          { timeout: 10000 }
        );

        return response.data?.status || "unknown";
      }
    } catch (error) {
      logError(`Error checking ${service} status:`, error);
      return "offline";
    }

    return "unknown";
  };

  // Check all services
  const checkNow = async () => {
    if (isChecking) return;

    setIsChecking(true);

    try {
      const [plexStatus, tautulliStatus] = await Promise.all([
        checkServiceStatus("plex"),
        checkServiceStatus("tautulli"),
      ]);

      setPlex(plexStatus);
      setTautulli(tautulliStatus);
      setLastChecked(new Date());
    } catch (error) {
      logError("Error checking services:", error);
    } finally {
      setIsChecking(false);
    }
  };

  // Initial check when component mounts or config changes
  useEffect(() => {
    if (config) {
      checkNow();

      // Set up interval for periodic checks
      const interval = setInterval(checkNow, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [config]);

  // Function to capitalize first letter
  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // No need for getThemeBackgroundStyle anymore since we're using body classes

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Enhanced accent gradient effects for background - only for dark theme */}
      {themeName === "dark" && (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: `radial-gradient(circle at 15% 15%, rgba(${accentRgb}, 0.15) 0%, transparent 35%),
                      radial-gradient(circle at 85% 85%, rgba(${accentRgb}, 0.15) 0%, transparent 35%)`,
            opacity: 0.8,
          }}
        />
      )}

      {/* Subtle noise texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          mixBlendMode: "overlay",
        }}
      />

      {/* Themed Navbar */}
      <ThemedNavbar />

      {/* Themed Tab Bar */}
      <ThemedTabBar />

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-6 relative z-10">
        <Outlet />
      </main>

      {/* Footer with accent color, connection status and theme toggle */}
      <footer className="border-t border-gray-800/50 py-3 text-center text-sm text-gray-500 relative z-10 backdrop-blur-sm bg-black/30">
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* Left side with Accent info and Theme Toggle */}
          <div className="flex items-center gap-4 relative">
            <div className="flex items-center gap-2">
              <div className="bg-accent-light/20 rounded-md px-2 py-1 border border-accent/20">
                <p className="flex items-center gap-1">
                  <Icons.Palette size={14} className="text-accent-base" />
                  <span className="text-white">{displayVersion}</span>
                  <span className="text-accent-base ml-1 font-medium">
                    {themeName === "dark"
                      ? capitalizeFirstLetter(accentColor)
                      : capitalizeFirstLetter(themeName)}
                  </span>
                </p>
              </div>
            </div>

            {/* Theme Toggle - positioned relative so its popup will appear above it */}
            <div className="relative">
              <ThemeToggleFooter variant="simple" showAccent={true} />
            </div>
          </div>

          {/* Right side with Connection Status */}
          <div className="relative">
            {/* Connection Status Indicator with absolute positioned popup above */}
            <button
              onClick={() => setShowStatusDetails(!showStatusDetails)}
              className="flex items-center gap-2 text-accent-base hover:text-accent-hover transition-colors 
                px-3 py-1.5 rounded-md hover:bg-accent-light/20 border border-transparent
                hover:border-accent/20 focus:outline-none"
              title="Check connection status"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  plex === "online" && tautulli === "online"
                    ? "bg-green-500"
                    : plex === "offline" || tautulli === "offline"
                    ? "bg-red-500"
                    : "bg-gray-500"
                } ${isChecking ? "animate-pulse" : ""}`}
              ></div>
              <span className="text-xs">
                {plex === "online" && tautulli === "online"
                  ? "All Services Connected"
                  : plex === "offline" || tautulli === "offline"
                  ? "Connection Issues"
                  : "Checking..."}
              </span>
              {isChecking && (
                <Icons.RefreshCw
                  size={12}
                  className="text-accent-base animate-spin"
                />
              )}
            </button>

            {/* Connection Status Details Popup - positioned above the button */}
            {showStatusDetails && (
              <div
                className="absolute bottom-full right-0 mb-2 bg-gray-800/90 backdrop-blur-sm 
                rounded-lg px-4 py-3 border border-accent/30 shadow-lg flex flex-col gap-2
                after:content-[''] after:absolute after:top-full after:right-4 
                after:border-l-[6px] after:border-l-transparent after:border-r-[6px] after:border-r-transparent
                after:border-t-[6px] after:border-t-accent/30"
              >
                <ConnectionStatusIndicator status={plex} service="plex" />
                <ConnectionStatusIndicator
                  status={tautulli}
                  service="tautulli"
                />
                <div className="flex items-center gap-1 text-xs mt-1 text-gray-300 border-t border-accent/20 pt-2">
                  <Icons.Clock size={12} className="text-accent-base/70" />
                  <span className="text-gray-400">Last checked:</span>
                  <span className="text-white">
                    {lastChecked ? lastChecked.toLocaleTimeString() : "Never"}
                  </span>
                  <button
                    onClick={() => checkNow()}
                    className="ml-auto text-accent-base hover:text-accent-hover transition-colors
                      p-1 rounded hover:bg-accent-light/20"
                    disabled={isChecking}
                  >
                    <Icons.RefreshCw
                      size={14}
                      className={
                        isChecking ? "text-accent-base animate-spin" : ""
                      }
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ThemedDashboardLayout;
