import React, { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Moon, Sun, Palette } from "lucide-react";

/**
 * A reusable theme toggle component that can be used throughout the application
 * @param {Object} props
 * @param {'simple'|'full'} props.variant - Display variant (simple for icon-only, full for expanded)
 * @param {boolean} props.showAccent - Whether to show accent color options
 */
const ThemeToggle = ({ variant = "simple", showAccent = false }) => {
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  const [showAccentMenu, setShowAccentMenu] = useState(false);

  // List of accent colors with their display names
  const accentColors = [
    { id: "default", name: "Default" },
    { id: "green", name: "Green" },
    { id: "purple", name: "Purple" },
    { id: "orange", name: "Orange" },
    { id: "blue", name: "Blue" },
    { id: "red", name: "Red" },
  ];

  // Toggle theme between light and dark
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Simple variant just shows the theme toggle button
  if (variant === "simple") {
    return (
      <button
        onClick={toggleTheme}
        className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
        title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
      </button>
    );
  }

  // Full variant shows more options
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Theme toggle button */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 text-gray-300 hover:text-white hover:bg-gray-800 
            rounded-lg transition-all duration-200 border border-gray-700/50"
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? (
            <>
              <Moon size={18} />
              <span className="text-sm font-medium">Dark Mode</span>
            </>
          ) : (
            <>
              <Sun size={18} />
              <span className="text-sm font-medium">Light Mode</span>
            </>
          )}
        </button>

        {/* Accent color selector button */}
        {showAccent && (
          <button
            onClick={() => setShowAccentMenu(!showAccentMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 text-gray-300 hover:text-white hover:bg-gray-800 
              rounded-lg transition-all duration-200 border border-gray-700/50"
            title="Select accent color"
          >
            <Palette size={18} />
            <span className="text-sm font-medium">Accent</span>
          </button>
        )}
      </div>

      {/* Accent color dropdown menu */}
      {showAccent && showAccentMenu && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 border border-gray-700/50 
          z-50 py-1 focus:outline-none"
        >
          <div className="py-1">
            {accentColors.map((color) => (
              <button
                key={color.id}
                className={`flex items-center w-full text-left px-4 py-2 text-sm 
                  ${
                    accentColor === color.id
                      ? "bg-gray-700 text-white"
                      : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
                  }`}
                onClick={() => {
                  setAccentColor(color.id);
                  setShowAccentMenu(false);
                }}
              >
                <span
                  className={`w-3 h-3 rounded-full mr-2 inline-block
                    ${
                      color.id === "default"
                        ? "bg-gray-400"
                        : color.id === "green"
                        ? "bg-green-500"
                        : color.id === "purple"
                        ? "bg-purple-500"
                        : color.id === "orange"
                        ? "bg-orange-500"
                        : color.id === "blue"
                        ? "bg-blue-500"
                        : color.id === "red"
                        ? "bg-red-500"
                        : ""
                    }`}
                ></span>
                {color.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
