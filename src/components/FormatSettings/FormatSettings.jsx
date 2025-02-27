import React, { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import DownloadsFormat from "./DownloadsFormat";
import RecentlyAddedFormat from "./RecentlyAddedFormat";
import UsersFormat from "./UsersFormat";
import SectionsFormat from "./SectionsFormat";
import LibrariesFormat from "./LibrariesFormat";

const ThemedSubTabButton = ({ active, onClick, children }) => {
  const { theme } = useTheme();

  // Get theme-specific styles
  const getThemeStyles = () => {
    if (active) {
      switch (theme) {
        case "light":
          return "bg-gray-200 text-gray-800";
        case "blue":
          return "bg-blue-500 text-white";
        case "purple":
          return "bg-purple-500 text-white";
        case "green":
          return "bg-green-500 text-white";
        default: // dark
          return "bg-gray-700 text-white";
      }
    } else {
      // Non-active states
      switch (theme) {
        case "light":
          return "text-gray-600 hover:text-gray-800 hover:bg-gray-100";
        case "blue":
          return "text-gray-400 hover:text-white hover:bg-blue-700/50";
        case "purple":
          return "text-gray-400 hover:text-white hover:bg-purple-700/50";
        case "green":
          return "text-gray-400 hover:text-white hover:bg-green-700/50";
        default: // dark
          return "text-gray-400 hover:text-white hover:bg-gray-700/50";
      }
    }
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${getThemeStyles()}`}
    >
      {children}
    </button>
  );
};

const FormatSettings = () => {
  const [activeSubTab, setActiveSubTab] = useState("downloads");
  const { theme } = useTheme();

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-6">
        <ThemedSubTabButton
          active={activeSubTab === "downloads"}
          onClick={() => setActiveSubTab("downloads")}
        >
          Downloads
        </ThemedSubTabButton>
        <ThemedSubTabButton
          active={activeSubTab === "recentlyAdded"}
          onClick={() => setActiveSubTab("recentlyAdded")}
        >
          Recently Added
        </ThemedSubTabButton>
        <ThemedSubTabButton
          active={activeSubTab === "users"}
          onClick={() => setActiveSubTab("users")}
        >
          Users
        </ThemedSubTabButton>
        <ThemedSubTabButton
          active={activeSubTab === "libraries"}
          onClick={() => setActiveSubTab("libraries")}
        >
          Libraries
        </ThemedSubTabButton>
        <ThemedSubTabButton
          active={activeSubTab === "sections"}
          onClick={() => setActiveSubTab("sections")}
        >
          Sections
        </ThemedSubTabButton>
      </div>

      {activeSubTab === "downloads" && <DownloadsFormat />}
      {activeSubTab === "recentlyAdded" && <RecentlyAddedFormat />}
      {activeSubTab === "users" && <UsersFormat />}
      {activeSubTab === "libraries" && <LibrariesFormat />}
      {activeSubTab === "sections" && <SectionsFormat />}
    </div>
  );
};

export default FormatSettings;
