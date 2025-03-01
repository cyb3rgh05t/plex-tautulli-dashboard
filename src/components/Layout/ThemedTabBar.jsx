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
  ];

  // Render tab with consistent styling
  const renderTab = (tab) => {
    const isActive = location.pathname === tab.to;
    const Icon = tab.icon;

    return (
      <Link
        key={tab.to}
        to={tab.to}
        className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 ${
          isActive
            ? "bg-accent-light text-accent-base border border-accent/20"
            : "text-gray-400 hover:text-white hover:bg-gray-700/50"
        }`}
      >
        {Icon && (
          <Icon size={20} className={isActive ? "text-accent-base" : ""} />
        )}
        <span className="font-medium">{tab.label}</span>
      </Link>
    );
  };

  return (
    <nav className="border-b border-gray-800/50 bg-gray-900/70 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {mainTabs.map(renderTab)}

          <div className="ml-auto flex items-center gap-2">
            {settingsTabs.map(renderTab)}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default ThemedTabBar;
