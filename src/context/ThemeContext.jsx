import React, { createContext, useState, useEffect, useContext } from "react";
import { logInfo } from "../utils/logger";

// Create context
const ThemeContext = createContext(null);

// THEME DEFINITIONS - Only dark theme
const THEMES = {
  dark: {
    "--main-bg-color":
      "radial-gradient(circle, #3a3a3a, #2d2d2d, #202020, #141414, #000000) center center/cover no-repeat fixed",
    "--modal-bg-color": "#1f2937",
    "--modal-header-color": "#1f2937",
    "--modal-footer-color": "#1f2937",
    "--drop-down-menu-bg": "#2d2d2d",
    "--button-color": "#7a7a7a",
    "--button-color-hover": "#9b9b9b",
    "--button-text": "#eee",
    "--button-text-hover": "#fff",
    "--text": "#ddd",
    "--text-hover": "#fff",
    "--text-muted": "#999",
  },
};

// RENAMED: default → purple, purple → maroon, light → grey
const ACCENTS = {
  purple: {
    "--accent-color": "167, 139, 250",
    "--link-color": "#6366f1",
    "--link-color-hover": "#a78bfa",
  },
  grey: {
    "--accent-color": "220, 220, 220",
    "--link-color": "#e5e7eb",
    "--link-color-hover": "#ffffff",
  },
  green: {
    "--accent-color": "109, 247, 81",
    "--link-color": "rgb(109, 247, 81)",
    "--link-color-hover": "rgba(109, 247, 81, 0.8)",
  },
  maroon: {
    "--accent-color": "166, 40, 140",
    "--link-color": "rgb(223, 21, 179)",
    "--link-color-hover": "rgb(255, 0, 200)",
  },
  orange: {
    "--accent-color": "255, 153, 0",
    "--link-color": "rgb(255, 153, 0)",
    "--link-color-hover": "rgba(255, 153, 0, 0.8)",
  },
  blue: {
    "--accent-color": "0, 98, 255",
    "--link-color": "rgb(61, 126, 255)",
    "--link-color-hover": "rgb(0, 98, 255)",
  },
  red: {
    "--accent-color": "232, 12, 11",
    "--link-color": "rgb(232, 12, 11)",
    "--link-color-hover": "rgba(232, 12, 11, 0.8)",
  },
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // State for theme (always dark) and accent color
  const [theme, setTheme] = useState("dark");
  const [accentColor, setAccentColor] = useState("purple"); // Changed default from "default" to "purple"
  const [isLoading, setIsLoading] = useState(true);

  // Function to get accent RGB values - updated names
  const getAccentRgb = (accent) => {
    const accentColorMap = {
      purple: "167, 139, 250", // Renamed from default
      grey: "220, 220, 220", // Renamed from light
      green: "109, 247, 81",
      maroon: "166, 40, 140", // Renamed from purple
      orange: "255, 153, 0",
      blue: "0, 98, 255",
      red: "232, 12, 11",
    };

    return accentColorMap[accent] || accentColorMap.purple;
  };

  // Load saved preferences from localStorage
  useEffect(() => {
    try {
      // Ensure we're in a browser environment
      if (typeof localStorage === "undefined") {
        setIsLoading(false);
        return;
      }

      // Load saved accent but map ONLY old names to new ones
      const savedAccent = localStorage.getItem("accentColor");

      // Map old accent names to new ones (only legacy names)
      const accentNameMap = {
        default: "purple",
        light: "grey",
        // Remove "purple": "maroon" mapping to fix reload issue
      };

      if (savedAccent) {
        // If the saved accent is one of the renamed ones, use the new name
        if (accentNameMap[savedAccent]) {
          setAccentColor(accentNameMap[savedAccent]);
        } else {
          setAccentColor(savedAccent);
        }
      }

      logInfo("Theme preferences loaded", {
        theme: "dark", // Always dark theme
        accent: savedAccent
          ? accentNameMap[savedAccent] || savedAccent
          : accentColor,
      });
    } catch (error) {
      console.error("Failed to load theme preferences:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Apply theme directly with inline styles
  useEffect(() => {
    if (isLoading) return;

    // Safety check for browser environment
    if (typeof document === "undefined") return;

    try {
      // Get document HTML and body elements with safety checks
      const htmlElement = document.documentElement;
      const bodyElement = document.body;

      if (!htmlElement || !bodyElement) {
        console.warn("HTML or Body element not found for theme application");
        return;
      }

      // Apply theme classes (for CSS that still uses class selectors)
      htmlElement.classList.remove("theme-light");
      htmlElement.classList.add("theme-dark");

      // Apply accent classes - remove all possible classes first
      htmlElement.classList.remove(
        "accent-purple", // Renamed from default
        "accent-grey", // Renamed from light
        "accent-green",
        "accent-maroon", // Renamed from purple
        "accent-orange",
        "accent-blue",
        "accent-red",
        // Also remove old class names for backward compatibility
        "accent-default",
        "accent-light",
        "accent-purple"
      );
      htmlElement.classList.add(`accent-${accentColor}`);

      // DIRECT APPLICATION OF STYLES
      // Apply theme variables directly to both html and body elements
      const themeVars = THEMES.dark;
      const accentVars = ACCENTS[accentColor] || ACCENTS.purple;

      // Merge theme and accent variables
      const allVars = { ...themeVars, ...accentVars };

      // Set --accent-color-hover derived from accent-color
      allVars[
        "--accent-color-hover"
      ] = `rgba(${allVars["--accent-color"]}, 0.8)`;

      // Set gradient variables
      allVars[
        "--overseerr-gradient"
      ] = `linear-gradient(rgba(${allVars["--accent-color"]}, 0.3) 0%, rgba(0, 0, 0) 100%)`;

      // Apply all variables directly to html element
      Object.entries(allVars).forEach(([property, value]) => {
        htmlElement.style.setProperty(property, value);
        // Also apply to body as fallback
        bodyElement.style.setProperty(property, value);
      });

      // Save preferences to localStorage (with safety check)
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("theme", "dark"); // Always dark theme
        localStorage.setItem("accentColor", accentColor);
      }

      logInfo("Applied theme directly", { theme: "dark", accentColor });
    } catch (error) {
      console.error("Failed to apply theme:", error);
    }
  }, [accentColor, isLoading]);

  // Create the context value with the RGB value
  const contextValue = {
    theme: "dark", // Always dark
    setTheme: () => {}, // No-op function since we always use dark theme
    accentColor,
    setAccentColor,
    accentRgb: getAccentRgb(accentColor),
    isLoading,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
