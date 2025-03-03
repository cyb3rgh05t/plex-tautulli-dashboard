import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useConfig } from "../../context/ConfigContext";
import ThemedNavbar from "./ThemedNavbar";
import ThemedTabBar from "./ThemedTabBar";
import ThemeToggleFooter from "./ThemedToggleFooter";
import useConnectionStatus from "../../hooks/useConnectionStatus";
import * as Icons from "lucide-react";
import { appVersion } from "../../../version.js";

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
      <Icon size={12} className="text-accent-base" />
      <span className="text-accent-base">
        {service === "plex" ? "Plex" : "Tautulli"}:
      </span>
      <div className="flex items-center gap-1">
        <div
          className={`w-1.5 h-1.5 rounded-full ${getStatusColor(status)}`}
        ></div>
        <span className="text-gray-300">{getStatusText(status)}</span>
      </div>
    </div>
  );
};

/**
 * The main dashboard layout with themed components that respond to accent color changes
 */
const ThemedDashboardLayout = () => {
  const { accentColor } = useTheme();
  const { config } = useConfig();
  const { plex, tautulli, isChecking, lastChecked, checkNow } =
    useConnectionStatus(config);
  const [showStatusDetails, setShowStatusDetails] = useState(false);

  // Function to capitalize first letter
  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  return (
    <div
      className={`min-h-screen flex flex-col bg-main theme-dark accent-${accentColor} 
        dashboard-accent-gradient relative`}
    >
      {/* Accent color overlay */}
      <div className="dashboard-accent-overlay" />

      {/* Themed Navbar */}
      <ThemedNavbar />

      {/* Themed Tab Bar */}
      <ThemedTabBar />

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-6 relative z-10">
        <Outlet />
      </main>

      {/* Footer with accent color, connection status and theme toggle */}
      <footer className="border-t border-gray-800/50 py-4 text-center text-sm text-gray-500 relative z-10">
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* Left side with Accent info and Theme Toggle */}
          <div className="flex items-center gap-4 relative">
            <p>
              Plex &amp; Tautulli Dashboard {appVersion} —
              <span className="text-accent-base ml-1">
                Accent: {capitalizeFirstLetter(accentColor)}
              </span>
            </p>

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
              className="flex items-center gap-2 text-accent-base hover:text-accent-hover transition-colors px-2 py-1 rounded-md hover:bg-accent-light/10"
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
                <Icons.RefreshCw size={12} className="animate-spin" />
              )}
            </button>

            {/* Connection Status Details Popup - positioned above the button */}
            {showStatusDetails && (
              <div className="absolute bottom-full right-0 mb-2 bg-gray-800/90 rounded-lg px-4 py-2 border border-accent/30 shadow-lg flex flex-col gap-1.5">
                <ConnectionStatusIndicator status={plex} service="plex" />
                <ConnectionStatusIndicator
                  status={tautulli}
                  service="tautulli"
                />
                <div className="flex items-center gap-1 text-xs mt-1 text-gray-400 border-t border-accent/20 pt-1">
                  <span>Last checked:</span>
                  <span>
                    {lastChecked
                      ? new Date(lastChecked).toLocaleTimeString()
                      : "Never"}
                  </span>
                  <button
                    onClick={() => checkNow()}
                    className="ml-2 text-accent-base hover:text-accent-hover transition-colors"
                    disabled={isChecking}
                  >
                    <Icons.RefreshCw
                      size={12}
                      className={isChecking ? "animate-spin" : ""}
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
