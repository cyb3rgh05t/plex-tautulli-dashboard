import React, { useState } from "react";
import DownloadsFormat from "./DownloadsFormat";
import RecentlyAddedFormat from "./RecentlyAddedFormat";
import UsersFormat from "./UsersFormat";

const SubTabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      active
        ? "bg-gray-700 text-white"
        : "text-gray-400 hover:text-white hover:bg-gray-700/50"
    }`}
  >
    {children}
  </button>
);

const FormatSettings = () => {
  const [activeSubTab, setActiveSubTab] = useState("downloads");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-6">
        <SubTabButton
          active={activeSubTab === "downloads"}
          onClick={() => setActiveSubTab("downloads")}
        >
          Downloads
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
      </div>

      {activeSubTab === "downloads" && <DownloadsFormat />}
      {activeSubTab === "recentlyAdded" && <RecentlyAddedFormat />}
      {activeSubTab === "users" && <UsersFormat />}
    </div>
  );
};

export default FormatSettings;
