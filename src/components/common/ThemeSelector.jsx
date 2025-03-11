import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Palette, Check, Monitor } from "lucide-react";

/**
 * A theme selector component that allows switching between different theme presets
 * @param {'simple'|'full'} variant - Display variant (simple for icon-only, full for expanded)
 */
const ThemeSelector = ({ variant = "full" }) => {
  const { themeName, setThemeName, accentColor, allThemes } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowThemeMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Get theme preview color based on theme name
  const getThemePreviewColors = (theme) => {
    switch (theme) {
      case "dark":
        return {
          primary: "#0a0c14",
          secondary: "#141824",
          accent: `rgb(var(--accent-color))`,
        };
      case "dracula":
        return {
          primary: "#282a36",
          secondary: "#1e2029",
          accent: "#bd93f9",
        };
      case "plex":
        return {
          primary: "#1f1f1f",
          secondary: "#282828",
          accent: "#e5a00d",
        };
      case "overseerr":
        return {
          primary: "#111827",
          secondary: "#1f2937",
          accent: "#4f46e5",
        };
      case "onedark":
        return {
          primary: "#282c34",
          secondary: "#1e222a",
          accent: "#61afef",
        };
      case "nord":
        return {
          primary: "#2E3440",
          secondary: "#3B4252",
          accent: "#79b8ca",
        };
      case "hotline":
        return {
          primary: "#f765b8",
          secondary: "#155fa5",
          accent: "#f98dc9",
        };
      case "aquamarine":
        return {
          primary: "#47918a",
          secondary: "#0b3161",
          accent: "#009688",
        };
      default:
        return {
          primary: "#0a0c14",
          secondary: "#141824",
          accent: `rgb(var(--accent-color))`,
        };
    }
  };

  // Render theme menu dropdown
  const renderThemeMenu = () => {
    const themeOptions = Object.entries(allThemes).map(([id, details]) => ({
      id,
      name: details.name,
      description: details.description,
    }));

    return (
      <div
        ref={menuRef}
        className={`absolute ${
          variant === "full" ? "top-full mt-2" : "bottom-full mb-2"
        } right-0 p-4 rounded-xl shadow-lg z-50 border border-accent bg-gray-900/80 backdrop-blur-sm`}
      >
        <div className="flex items-center gap-2 mb-4">
          <Monitor size={16} className="text-accent" />
          <h3 className="text-sm font-medium text-white">Theme Presets</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 min-w-[300px]">
          {themeOptions.map((theme) => {
            const colors = getThemePreviewColors(theme.id);
            return (
              <button
                key={theme.id}
                className={`
                  flex flex-col items-center p-3 rounded-lg transition-theme
                  ${
                    themeName === theme.id
                      ? "bg-accent-light/20 border-2 border-white/80"
                      : "border border-accent"
                  }
                  hover:bg-white/10 hover:border-white/40
                `}
                onClick={() => {
                  setThemeName(theme.id);
                  setShowThemeMenu(false);
                }}
              >
                {/* Theme preview swatch */}
                <div className="w-full h-16 mb-2 rounded-md overflow-hidden shadow-md relative">
                  {/* Gradient or solid background */}
                  {theme.id === "hotline" || theme.id === "aquamarine" ? (
                    <div
                      className="w-full h-full"
                      style={{
                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                      }}
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ background: colors.primary }}
                    />
                  )}

                  {/* Accent color strip */}
                  <div
                    className="absolute bottom-0 left-0 w-full h-2"
                    style={{ background: colors.accent }}
                  />

                  {/* Selected indicator */}
                  {themeName === theme.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/20 rounded-full p-1">
                        <Check size={18} className="text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Theme info */}
                <div className="text-center">
                  <span className="text-white text-sm font-medium block">
                    {theme.name}
                  </span>
                  <span className="text-gray-400 text-xs block mt-1">
                    {theme.description}
                  </span>
                  {theme.id === "dark" && (
                    <span className="text-accent-base text-xs block mt-1">
                      Supports custom accents
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Simple variant (icon only)
  if (variant === "simple") {
    return (
      <div className="relative">
        <button
          onClick={() => setShowThemeMenu(!showThemeMenu)}
          className="text-gray-400 hover:text-white transition-theme p-2 rounded-lg hover:bg-gray-700/50"
          title="Change theme"
        >
          <Monitor size={20} />
        </button>

        {/* Theme menu dropdown */}
        {showThemeMenu && renderThemeMenu()}
      </div>
    );
  }

  // Full variant with text
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowThemeMenu(!showThemeMenu)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 text-gray-300 hover:text-white hover:bg-gray-800 
          rounded-lg transition-theme border border-accent"
        title="Change theme"
      >
        <Monitor size={18} className="text-accent" />
        <span className="text-sm font-medium">Theme</span>
      </button>

      {/* Theme menu dropdown */}
      {showThemeMenu && renderThemeMenu()}
    </div>
  );
};

export default ThemeSelector;
