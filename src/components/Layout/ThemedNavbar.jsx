import React, { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import UpdatedThemeToggle from "../common/UpdatedThemeToggle";
import Settings from "../Settings/Settings";
import * as Icons from "lucide-react";
import { appVersion } from "../../../version";

/**
 * A navbar component that changes color based on the current accent theme
 */
const ThemedNavbar = () => {
  const { accentColor } = useTheme();
  const [showSettings, setShowSettings] = useState(false);

  // Map accent colors to their RGB values for background gradient - UPDATED NAMES
  const accentColorMap = {
    purple: "167, 139, 250", // Renamed from default
    grey: "220, 220, 220", // Renamed from light
    green: "109, 247, 81",
    maroon: "166, 40, 140", // Renamed from purple
    orange: "255, 153, 0",
    blue: "0, 98, 255",
    red: "232, 12, 11",
  };

  const accentRgb = accentColorMap[accentColor] || accentColorMap.purple;

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b border-gray-800/50 
          bg-gradient-to-r from-[rgba(${accentRgb},0.1)] to-[rgba(${accentRgb},0.05)]
          backdrop-blur-sm transition-colors duration-300`}
      >
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          {/* Logo and Title */}
          <div className="flex items-center gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{
                background: `linear-gradient(135deg, rgba(${accentRgb}, 0.2) 0%, rgba(${accentRgb}, 0.1) 100%)`,
                border: `1px solid rgba(${accentRgb}, 0.3)`,
              }}
            >
              <Icons.LayoutGrid className="text-accent-base" size={22} />
            </div>
            <span className="hidden text-xl font-semibold text-white md:inline-block">
              Plex &amp; Tautulli Dashboard
            </span>
            <span className="text-xs bg-accent-light/30 text-accent-base px-2 py-1 rounded-md">
              {appVersion}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-medium 
                text-white bg-accent-light/20 hover:bg-accent-light/30 
                border border-accent/20 transition-colors"
            >
              <Icons.Server className="mr-1.5" size={16} />
              Plex
            </button>
            <button
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-medium 
                text-white bg-accent-light/20 hover:bg-accent-light/30 
                border border-accent/20 transition-colors"
            >
              <Icons.Database className="mr-1.5" size={16} />
              Tautulli
            </button>
            {/* Settings Icon Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
              title="Settings"
            >
              <Icons.Settings size={20} />
            </button>
            <UpdatedThemeToggle variant="full" showAccent={true} />
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50">
          <Settings onClose={() => setShowSettings(false)} />
        </div>
      )}
    </>
  );
};

export default ThemedNavbar;
