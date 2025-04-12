import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import * as Icons from "lucide-react";

const ThemedTabBar = () => {
  const location = useLocation();
  const { themeName, accentColor } = useTheme();

  // Define tabs with their routes, icons, and labels
  const mainTabs = [
    { to: "/activities", icon: Icons.Download, label: "Sync Activities" },
    { to: "/recent", icon: Icons.Clock, label: "Recently Added" },
    { to: "/libraries", icon: Icons.Database, label: "Libraries" },
    { to: "/users", icon: Icons.Users, label: "Users Activities" },
  ];

  const settingsTabs = [
    { to: "/format", icon: Icons.SlidersHorizontal, label: "Format Settings" },
    { to: "/api-endpoints", icon: Icons.Code, label: "API Endpoints" },
    { to: "/settings", icon: Icons.Settings, label: "Settings" },
  ];

  // Render tab with enhanced styling
  const renderTab = (tab) => {
    const isActive = location.pathname === tab.to;
    const Icon = tab.icon;

    // Active styling with transparent background and accent borders
    const activeClasses = "bg-transparent border border-accent";

    return (
      <Link
        key={tab.to}
        to={tab.to}
        className={`
          relative flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200
          ${
            isActive
              ? activeClasses
              : "text-gray-400 hover:text-white hover:bg-gray-800/40 border border-transparent"
          }
          group
        `}
        aria-current={isActive ? "page" : undefined}
      >
        {/* Icon - accent color when active */}
        <Icon
          size={18}
          className={`transition-colors ${
            isActive ? "text-accent" : "text-gray-400 group-hover:text-gray-200"
          }`}
        />

        {/* Label with accent color when active */}
        <span
          className={`
          font-medium transition-colors
          ${isActive ? "text-accent" : "group-hover:text-white"}
        `}
        >
          {tab.label}
        </span>
      </Link>
    );
  };

  return (
    <nav className="sticky top-16 z-40 border-b border-gray-800/70 shadow-sm bg-theme">
      {/* Use theme-bg classes for consistent background across themes */}
      <div className="absolute inset-0 -z-10 bg-theme-modal">
        {/* Subtle accent gradient effect */}
        <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-accent via-transparent to-accent"></div>
      </div>

      <div className="container mx-auto px-4">
        <div className="flex items-center overflow-x-auto py-0.5 hide-scrollbar scrollbar-none">
          {/* Main tabs - wrapping in a div for better mobile scrolling */}
          <div className="flex items-center gap-1 py-1">
            {mainTabs.map(renderTab)}
          </div>

          <div className="ml-auto flex items-center gap-1">
            {/* Divider with enhanced styling */}
            <div className="h-6 mx-2 w-px bg-gradient-to-b from-transparent via-accent/30 to-transparent"></div>

            {/* Settings tabs */}
            {settingsTabs.map(renderTab)}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default ThemedTabBar;
