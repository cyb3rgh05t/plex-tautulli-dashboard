import React from "react";
import { Link, useLocation } from "react-router-dom";
import * as Icons from "lucide-react";

const ThemedTabBar = () => {
  const location = useLocation();

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

    return (
      <Link
        key={tab.to}
        to={tab.to}
        className={`
          relative flex items-center gap-2 px-4 py-3 rounded-lg transition-theme
          ${
            isActive
              ? "tab-accent active text-accent bg-accent-light border border-accent/20"
              : "text-gray-400 hover:text-white hover:bg-gray-700/50 hover:border-accent/10 border border-transparent"
          }
        `}
      >
        {/* Add subtle accent glow for active tabs */}
        {isActive && (
          <div className="absolute inset-0 rounded-lg -z-10 opacity-20 blur-sm bg-accent"></div>
        )}

        {Icon && (
          <Icon
            size={20}
            className={
              isActive ? "text-accent" : "text-gray-400 group-hover:text-white"
            }
          />
        )}
        <span className="font-medium">{tab.label}</span>
      </Link>
    );
  };

  return (
    <nav className="border-b border-gray-800/50 backdrop-blur-sm relative bg-gray-900/70">
      {/* Subtle accent gradient background effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-accent"></div>

      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {mainTabs.map(renderTab)}

          <div className="ml-auto flex items-center gap-2">
            {/* Subtle vertical divider with accent color */}
            <div className="h-6 w-px mx-1 opacity-30 bg-accent"></div>

            {settingsTabs.map(renderTab)}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default ThemedTabBar;
