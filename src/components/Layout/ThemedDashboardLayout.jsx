import React from "react";
import { Outlet } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import ThemedNavbar from "./ThemedNavbar";
import ThemedTabBar from "./ThemedTabBar";
import UpdatedThemeToggle from "../common/UpdatedThemeToggle";

/**
 * The main dashboard layout with themed components that respond to accent color changes
 */
const ThemedDashboardLayout = () => {
  const { accentColor } = useTheme();

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

      {/* Footer with accent color and theme toggle */}
      <footer className="border-t border-gray-800/50 py-4 text-center text-sm text-gray-500 relative z-10">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <p>
            Plex &amp; Tautulli Dashboard v1.1.6 —
            <span className="text-accent-base ml-1">Accent: {accentColor}</span>
          </p>

          {/* Add Theme Toggle to Footer */}
          <UpdatedThemeToggle variant="full" showAccent={true} />
        </div>
      </footer>
    </div>
  );
};

export default ThemedDashboardLayout;
