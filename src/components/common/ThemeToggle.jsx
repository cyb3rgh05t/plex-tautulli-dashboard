import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Palette, Check, AlertCircle } from "lucide-react";

/**
 * A theme toggle component that shows accent colors
 * @param {Object} props
 * @param {'simple'|'full'} props.variant - Display variant (simple for icon-only, full for expanded)
 * @param {boolean} props.showAccent - Whether to show accent color options
 */
const ThemeToggle = ({ variant = "simple", showAccent = true }) => {
  const { accentColor, setAccentColor, allAccents, themeName } = useTheme();
  const [showAccentMenu, setShowAccentMenu] = useState(false);
  const menuRef = useRef(null);

  // Only allow accent customization for dark theme
  const canCustomizeAccent = themeName === "dark";

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
        className="absolute top-full right-0 mt-2 p-4 rounded-xl shadow-lg z-50 border border-accent bg-gray-900/80 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2 mb-4">
          <Palette size={16} className="text-accent" />
          <h3 className="text-sm font-medium text-white">Accent Color</h3>
        </div>

        {canCustomizeAccent ? (
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
                  className="w-12 h-12 rounded-full mb-2 flex items-center justify-center transition-all group-hover:scale-105"
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
                <span className="text-white text-sm font-medium transition-all group-hover:text-opacity-80">
                  {color.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-3 bg-gray-800/50 rounded-lg border border-accent/30 mb-2">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-accent" />
              <h4 className="text-sm font-medium text-white">
                Theme-Defined Accent
              </h4>
            </div>
            <p className="text-xs text-gray-300">
              Custom accent colors are only available in Dark theme. Switch to
              Dark theme to customize accents.
            </p>
          </div>
        )}
      </div>
    );
  };

  // Simple variant just shows the accent toggle button
  if (variant === "simple") {
    return (
      <div className="relative">
        {showAccent && (
          <button
            onClick={() => setShowAccentMenu(!showAccentMenu)}
            className={`text-gray-400 hover:text-white transition-theme p-2 rounded-lg hover:bg-gray-700/50 ${
              !canCustomizeAccent ? "opacity-60" : ""
            }`}
            title={
              canCustomizeAccent
                ? "Change accent color"
                : "Theme-defined accent color"
            }
          >
            <Palette size={20} />
          </button>
        )}

        {/* Accent color dropdown menu */}
        {showAccent && showAccentMenu && renderAccentColorMenu()}
      </div>
    );
  }

  // Full variant shows more options
  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center gap-2">
        {/* Accent color selector button */}
        {showAccent && (
          <button
            onClick={() => setShowAccentMenu(!showAccentMenu)}
            className={`flex items-center gap-2 px-3 py-2 
              ${
                canCustomizeAccent
                  ? "bg-gray-800/50 hover:bg-gray-800"
                  : "bg-gray-800/30"
              }
              text-gray-300 hover:text-white 
              rounded-lg transition-theme border border-accent
              ${!canCustomizeAccent ? "opacity-80" : ""}`}
            title={
              canCustomizeAccent
                ? "Change accent color"
                : "Theme-defined accent color"
            }
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
            {!canCustomizeAccent && (
              <span className="text-xs ml-1 opacity-70">Theme-defined</span>
            )}
          </button>
        )}
      </div>

      {/* Accent color dropdown menu */}
      {showAccent && showAccentMenu && renderAccentColorMenu()}
    </div>
  );
};

export default ThemeToggle;
