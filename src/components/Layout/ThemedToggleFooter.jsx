import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Palette, Check, Monitor } from "lucide-react";
import ThemeSelector from "../common/ThemeSelector";

/**
 * A theme toggle component for the footer that shows accent colors and theme options
 */
const ThemeToggleFooter = ({ variant = "simple", showAccent = true }) => {
  const { accentColor, setAccentColor, allAccents, themeName } = useTheme();

  // Only show accent picker for dark theme
  const canCustomizeAccent = themeName === "dark";
  const [showAccentMenu, setShowAccentMenu] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowAccentMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Render accent color menu
  const renderAccentColorMenu = () => {
    const accentColors = Object.entries(allAccents).map(([id, details]) => ({
      id,
      name: details.name,
      rgb: details.rgb,
    }));

    return (
      <div
        ref={menuRef}
        className="absolute bottom-full right-0 mb-2 p-4 rounded-xl shadow-lg z-50 border border-accent bg-gray-900/80 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2 mb-4">
          <Palette size={16} className="text-accent" />
          <h3 className="text-sm font-medium text-white">Accent Color</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 min-w-[200px]">
          {accentColors.map((color) => (
            <button
              key={color.id}
              className={`
                flex flex-col items-center p-3 rounded-lg transition-theme
                ${
                  accentColor === color.id
                    ? "border-2 border-white/80"
                    : "border border-accent"
                }
                hover:bg-white/10 hover:border-white/40
              `}
              style={{
                backgroundColor:
                  accentColor === color.id
                    ? `rgba(${color.rgb}, 0.2)`
                    : "transparent",
              }}
              onClick={() => {
                setAccentColor(color.id);
                setShowAccentMenu(false);
              }}
            >
              <div
                className="w-12 h-12 rounded-full mb-2 flex items-center justify-center transition-all"
                style={{
                  background: `linear-gradient(135deg, rgba(${color.rgb}, 0.8) 0%, rgba(${color.rgb}, 0.4) 100%)`,
                  boxShadow:
                    accentColor === color.id
                      ? `0 0 10px rgba(${color.rgb}, 0.6)`
                      : "none",
                }}
              >
                {accentColor === color.id && (
                  <Check size={20} className="text-white" />
                )}
              </div>
              <span className="text-white text-sm font-medium">
                {color.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Simple variant just shows the accent toggle button
  if (variant === "simple") {
    return (
      <div className="flex items-center gap-2">
        {/* Theme selector */}
        <ThemeSelector variant="simple" />

        {/* Accent color selector - only for dark theme */}
        {canCustomizeAccent && (
          <div className="relative">
            <button
              onClick={() => setShowAccentMenu(!showAccentMenu)}
              className="text-gray-400 hover:text-white transition-theme p-2 rounded-lg hover:bg-gray-700/50"
              title="Change accent color"
            >
              <Palette size={20} />
            </button>

            {/* Accent color dropdown menu */}
            {showAccentMenu && renderAccentColorMenu()}
          </div>
        )}
      </div>
    );
  }

  // Full variant shows more options
  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center gap-2">
        {/* Accent color selector button - only for dark theme */}
        {showAccent && canCustomizeAccent && (
          <button
            onClick={() => setShowAccentMenu(!showAccentMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 text-gray-300 hover:text-white hover:bg-gray-800 
              rounded-lg transition-theme border border-accent"
            title="Select accent color"
          >
            <Palette size={18} className="text-accent" />
            <div
              className="w-3 h-3 rounded-full"
              style={{
                background: `rgb(${
                  allAccents[accentColor]?.rgb || allAccents.purple.rgb
                })`,
              }}
            />
          </button>
        )}

        {/* Info indicator when on non-dark theme */}
        {showAccent && !canCustomizeAccent && (
          <div
            className="flex items-center gap-2 px-3 py-2 bg-gray-800/20 text-gray-300 
            rounded-lg border border-accent/50"
          >
            <Palette size={18} className="text-accent-base/50" />
            <span className="text-xs">Theme-defined accent</span>
          </div>
        )}
      </div>

      {/* Accent color dropdown menu */}
      {showAccent &&
        canCustomizeAccent &&
        showAccentMenu &&
        renderAccentColorMenu()}
    </div>
  );
};

export default ThemeToggleFooter;
