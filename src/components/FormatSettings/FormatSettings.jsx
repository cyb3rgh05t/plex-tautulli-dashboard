import React, { useState } from "react";
import DownloadsFormat from "./DownloadsFormat";
import RecentlyAddedFormat from "./RecentlyAddedFormat";
import UsersFormat from "./UsersFormat";
import SectionsFormat from "./SectionsFormat";
import LibrariesFormat from "./LibrariesFormat";
import ThemedCard from "../common/ThemedCard";
import * as Icons from "lucide-react";
import { logError, logInfo, logDebug, logWarn } from "../../utils/logger";

const SubTabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      active
        ? "bg-accent-light text-accent-base"
        : "text-gray-400 hover:text-white hover:bg-gray-700/50"
    }`}
  >
    {children}
  </button>
);

const FormatSettings = () => {
  const [activeSubTab, setActiveSubTab] = useState("downloads");

  // Map tab IDs to their corresponding icon and title for the card header
  const tabInfo = {
    downloads: {
      icon: Icons.Download,
      title: "Sync Format Settings",
    },
    recentlyAdded: {
      icon: Icons.Clock,
      title: "Recently Added Format Settings",
    },
    users: {
      icon: Icons.Users,
      title: "Users Format Settings",
    },
    libraries: {
      icon: Icons.Database,
      title: "Libraries Format Settings",
    },
    sections: {
      icon: Icons.Layers,
      title: "Metadata Format Settings",
    },
  };

  // Get current tab's icon and title
  const currentTab = tabInfo[activeSubTab];

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        <SubTabButton
          active={activeSubTab === "downloads"}
          onClick={() => setActiveSubTab("downloads")}
        >
          Sync
        </SubTabButton>
        <SubTabButton
          active={activeSubTab === "recentlyAdded"}
          onClick={() => setActiveSubTab("recentlyAdded")}
        >
          Recently Added
        </SubTabButton>
        <SubTabButton
          active={activeSubTab === "users"}
          onClick={() => setActiveSubTab("users")}
        >
          Users
        </SubTabButton>
        <SubTabButton
          active={activeSubTab === "libraries"}
          onClick={() => setActiveSubTab("libraries")}
        >
          Libraries
        </SubTabButton>
        <SubTabButton
          active={activeSubTab === "sections"}
          onClick={() => setActiveSubTab("sections")}
        >
          Media Metadata
        </SubTabButton>
      </div>

      {/* Tab content wrapper */}
      <ThemedCard
        title={currentTab.title}
        icon={currentTab.icon}
        className="p-6"
      >
        {activeSubTab === "downloads" && <DownloadsFormat />}
        {activeSubTab === "recentlyAdded" && <RecentlyAddedFormat />}
        {activeSubTab === "users" && <UsersFormat />}
        {activeSubTab === "libraries" && <LibrariesFormat />}
        {activeSubTab === "sections" && <SectionsFormat />}
      </ThemedCard>
    </div>
  );
};

export default FormatSettings;
