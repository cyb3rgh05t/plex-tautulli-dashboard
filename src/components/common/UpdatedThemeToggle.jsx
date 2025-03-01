import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Palette, Check } from "lucide-react";

/**
 * A simplified theme toggle component that only shows accent colors
 * @param {Object} props
 * @param {'simple'|'full'} props.variant - Display variant (simple for icon-only, full for expanded)
 * @param {boolean} props.showAccent - Whether to show accent color options
 */
const UpdatedThemeToggle = ({ variant = "simple", showAccent = true }) => {
  const { accentColor, setAccentColor } = useTheme();
  const [showAccentMenu, setShowAccentMenu] = useState(false);
  const menuRef = useRef(null);

  // List of accent colors with their display names and RGB values - UPDATED NAMES
  const accentColors = [
    { id: "purple", name: "Purple", rgb: "167, 139, 250" }, // Renamed from default
    { id: "grey", name: "Grey", rgb: "220, 220, 220" }, // Renamed from light
    { id: "green", name: "Green", rgb: "109, 247, 81" },
    { id: "maroon", name: "Maroon", rgb: "166, 40, 140" }, // Renamed from purple
    { id: "orange", name: "Orange", rgb: "255, 153, 0" },
    { id: "blue", name: "Blue", rgb: "0, 98, 255" },
    { id: "red", name: "Red", rgb: "232, 12, 11" },
  ];

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

  // Simple variant just shows the accent toggle button
  if (variant === "simple") {
    return (
      <button
        onClick={() => setShowAccentMenu(!showAccentMenu)}
        className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
        title="Change accent color"
      >
        <Palette size={20} />
      </button>
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
            className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 text-gray-300 hover:text-white hover:bg-gray-800 
              rounded-lg transition-all duration-200 border border-gray-700/50"
            title="Select accent color"
            style={{
              borderColor: `rgba(${
                accentColors.find((c) => c.id === accentColor)?.rgb ||
                accentColors[0].rgb
              }, 0.5)`,
            }}
          >
            <Palette size={18} className="text-accent-base" />
            <div
              className="w-3 h-3 rounded-full"
              style={{
                background: `rgb(${
                  accentColors.find((c) => c.id === accentColor)?.rgb ||
                  accentColors[0].rgb
                })`,
              }}
            />
          </button>
        )}
      </div>

      {/* Accent color dropdown menu */}
      {showAccent && showAccentMenu && (
        <div
          className="absolute right-0 mt-2 p-2 rounded-lg shadow-lg bg-gray-800 border border-gray-700/50 
          z-50 focus:outline-none"
        >
          <h3 className="text-xs text-theme-muted px-2 py-1 mb-1">
            Accent Color
          </h3>
          <div className="grid grid-cols-3 gap-2 min-w-[180px]">
            {accentColors.map((color) => (
              <button
                key={color.id}
                className={`flex flex-col items-center justify-center p-2 rounded border transition-all duration-200 ${
                  accentColor === color.id
                    ? "border-white bg-gray-700"
                    : "border-gray-700 hover:border-gray-500 hover:bg-gray-700/50"
                }`}
                onClick={() => {
                  setAccentColor(color.id);
                  setShowAccentMenu(false);
                }}
                style={{
                  borderColor:
                    accentColor === color.id
                      ? `rgba(${color.rgb}, 0.8)`
                      : "rgba(75, 85, 99, 0.5)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full mb-1 flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, rgba(${color.rgb}, 0.7) 0%, rgba(${color.rgb}, 0.3) 100%)`,
                  }}
                >
                  {accentColor === color.id && (
                    <Check size={16} className="text-white" />
                  )}
                </div>
                <span className="text-xs text-white">{color.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdatedThemeToggle;
