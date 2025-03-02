import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Palette, Check } from "lucide-react";

/**
 * A theme toggle component that shows accent colors
 * @param {Object} props
 * @param {'simple'|'full'} props.variant - Display variant (simple for icon-only, full for expanded)
 * @param {boolean} props.showAccent - Whether to show accent color options
 */
const ThemeToggleFooter = ({ variant = "simple", showAccent = true }) => {
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

  // Render accent color menu
  const renderAccentColorMenu = (color) => {
    const currentColor =
      accentColors.find((c) => c.id === color) || accentColors[0];

    return (
      <div
        ref={menuRef}
        className="absolute bottom-full right-0 mt-2 p-4 rounded-xl shadow-lg z-50 focus:outline-none
          border border-gray-700/50 overflow-hidden"
        style={{
          // Base semi-transparent background
          backgroundColor: "rgba(31, 41, 55, 0.8)",

          // Accent color gradient behind the semi-transparent layer
          background: `
            linear-gradient(135deg, 
              rgba(${currentColor.rgb}, 0.3) 0%, 
              rgba(${currentColor.rgb}, 0.2) 100%), 
            rgba(31, 41, 55, 0.9)
          `,
          backdropFilter: "blur(10px)",
          borderColor: `rgba(${currentColor.rgb}, 0.4)`, // Subtle accent-colored border
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Palette size={16} className="text-accent-base" />
          <h3 className="text-sm font-medium text-white">Accent Color</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 min-w-[200px]">
          {accentColors.map((color) => (
            <button
              key={color.id}
              className={`flex flex-col items-center p-3 rounded-lg transition-all duration-200
                ${
                  accentColor === color.id
                    ? "border-2 border-white/80"
                    : "border border-gray-700/50"
                }
                hover:bg-white/10 hover:border-white/40`}
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
                className="w-12 h-12 rounded-full mb-2 flex items-center justify-center transition-all duration-200
                  group-hover:scale-105"
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
              <span
                className="text-white text-sm font-medium transition-all duration-200 
                group-hover:text-opacity-80"
              >
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
      <div className="relative">
        <button
          onClick={() => setShowAccentMenu(!showAccentMenu)}
          className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
          title="Change accent color"
        >
          <Palette size={20} />
        </button>

        {/* Accent color dropdown menu */}
        {showAccentMenu && renderAccentColorMenu(accentColor)}
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
      {showAccent && showAccentMenu && renderAccentColorMenu(accentColor)}
    </div>
  );
};

export default ThemeToggleFooter;
