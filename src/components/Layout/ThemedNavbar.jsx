import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useConfig } from "../../context/ConfigContext";
import ThemeToggle from "../common/ThemeToggle";
import ThemeSelector from "../common/ThemeSelector"; // Import the new component
import ServiceStatusBadge from "./ServiceStatusBadge";
import * as Icons from "lucide-react";
import { appVersion } from "../../../release.js";

/**
 * A navbar component that changes color based on the current accent theme
 */
const ThemedNavbar = () => {
  const navigate = useNavigate();
  const { accentColor, accentRgb, themeName } = useTheme();
  const { config } = useConfig();

  // Map accent colors to their RGB values for background gradient
  const accentColorMap = {
    purple: "167, 139, 250",
    grey: "220, 220, 220",
    green: "109, 247, 81",
    maroon: "166, 40, 140",
    orange: "255, 153, 0",
    blue: "0, 98, 255",
    red: "232, 12, 11",
  };

  const currentAccentRgb = accentRgb || accentColorMap.purple;

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-gray-800/50 
        bg-gradient-to-r from-[rgba(${currentAccentRgb},0.1)] to-[rgba(${currentAccentRgb},0.05)]
        backdrop-blur-sm transition-colors duration-300`}
    >
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo and Title */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{
              background: `linear-gradient(135deg, rgba(${currentAccentRgb}, 0.2) 0%, rgba(${currentAccentRgb}, 0.1) 100%)`,
              border: `1px solid rgba(${currentAccentRgb}, 0.3)`,
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

          {/* Display current theme name */}
          <span className="text-xs bg-accent-light/10 text-accent-base px-2 py-1 rounded-md ml-2">
            {themeName.charAt(0).toUpperCase() + themeName.slice(1)} Theme
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Plex Status Badge */}
          <ServiceStatusBadge
            type="plex"
            url={config?.plexUrl}
            token={config?.plexToken}
          />

          {/* Tautulli Status Badge */}
          <ServiceStatusBadge
            type="tautulli"
            url={config?.tautulliUrl}
            apiKey={config?.tautulliApiKey}
          />

          {/* Theme Selector - New! */}
          <ThemeSelector variant="full" />

          {/* Accent Color Picker */}
          <ThemeToggle variant="full" showAccent={true} />
        </div>
      </div>
    </header>
  );
};

export default ThemedNavbar;
