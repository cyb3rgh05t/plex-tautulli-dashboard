import React from "react";
import { useTheme } from "../../context/ThemeContext";

/**
 * A reusable themed tab button component that changes its styles based on the current theme
 *
 * @param {boolean} active - Whether the tab is currently active
 * @param {function} onClick - Click handler function
 * @param {React.ReactNode} children - Tab content/label
 * @param {React.ElementType} icon - Optional icon component
 * @param {string} className - Additional CSS classes
 */
const ThemedTabButton = ({
  active,
  onClick,
  children,
  icon: Icon,
  className = "",
}) => {
  const { theme } = useTheme();

  // Get theme-specific styles
  const getThemeStyles = () => {
    if (active) {
      switch (theme) {
        case "light":
          return "bg-gray-200 text-gray-800";
        case "blue":
          return "bg-blue-500 text-white";
        case "purple":
          return "bg-purple-500 text-white";
        case "green":
          return "bg-green-500 text-white";
        default: // dark
          return "bg-gray-700 text-white";
      }
    } else {
      // Non-active states
      switch (theme) {
        case "light":
          return "text-gray-600 hover:text-gray-800 hover:bg-gray-100";
        case "blue":
          return "text-gray-400 hover:text-white hover:bg-blue-700/50";
        case "purple":
          return "text-gray-400 hover:text-white hover:bg-purple-700/50";
        case "green":
          return "text-gray-400 hover:text-white hover:bg-green-700/50";
        default: // dark
          return "text-gray-400 hover:text-white hover:bg-gray-700/50";
      }
    }
  };

  // Get icon color
  const getIconColor = () => {
    if (active) {
      switch (theme) {
        case "light":
          return "text-gray-800";
        default:
          return "text-white";
      }
    } else {
      switch (theme) {
        case "light":
          return "text-gray-500";
        default:
          return "text-gray-500";
      }
    }
  };

  return (
    <button
      onClick={onClick}
      className={`format-settings-tab ${
        active ? "active" : ""
      } flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${getThemeStyles()} ${className}`}
    >
      {Icon && (
        <Icon className={active ? getIconColor() : "text-gray-500"} size={16} />
      )}
      {children}
    </button>
  );
};

export default ThemedTabButton;
