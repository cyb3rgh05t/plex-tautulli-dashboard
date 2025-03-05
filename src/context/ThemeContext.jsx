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

// Storage key constants
const STORAGE_KEYS = {
  THEME: "theme",
  ACCENT_COLOR: "accentColor",
};

// Default values
const DEFAULT_VALUES = {
  THEME: "dark",
  ACCENT_COLOR: "purple",
};

// Valid themes and accents
const VALID_THEMES = ["dark"];
const VALID_ACCENTS = Object.keys(ACCENTS);

// Storage helper functions
const getStoredTheme = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    return VALID_THEMES.includes(stored) ? stored : DEFAULT_VALUES.THEME;
  } catch (error) {
    console.error("Error reading theme from localStorage:", error);
    return DEFAULT_VALUES.THEME;
  }
};

const getStoredAccent = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ACCENT_COLOR);
    return VALID_ACCENTS.includes(stored)
      ? stored
      : DEFAULT_VALUES.ACCENT_COLOR;
  } catch (error) {
    console.error("Error reading accent from localStorage:", error);
    return DEFAULT_VALUES.ACCENT_COLOR;
  }
};

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
    return false;
  }
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
  const [theme, setTheme] = useState(DEFAULT_VALUES.THEME);
  const [accentColor, setAccentColor] = useState(DEFAULT_VALUES.ACCENT_COLOR);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preferences from localStorage
  useEffect(() => {
    try {
      // Ensure we're in a browser environment
      if (typeof localStorage === "undefined") {
        setIsLoading(false);
        return;
      }

      // Get stored values
      const storedTheme = getStoredTheme();
      const storedAccent = getStoredAccent();

      // Apply stored values
      setTheme(storedTheme);
      setAccentColor(storedAccent);

      logInfo("Theme preferences loaded", {
        theme: storedTheme,
        accent: storedAccent,
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
      const allAccentClasses = [
        ...VALID_ACCENTS.map((accent) => `accent-${accent}`),
        // Also include legacy class names for backward compatibility
        "accent-default",
        "accent-light",
        "accent-purple",
      ];

      htmlElement.classList.remove(...allAccentClasses);
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
      saveToStorage(STORAGE_KEYS.THEME, theme);
      saveToStorage(STORAGE_KEYS.ACCENT_COLOR, accentColor);

      logInfo("Applied theme directly", { theme, accentColor });
    } catch (error) {
      console.error("Failed to apply theme:", error);
    }
  }, [accentColor, isLoading]);

  // Function to get accent RGB values based on current accent
  const getAccentRgb = () => {
    const accentValue =
      ACCENTS[accentColor]?.["--accent-color"] ||
      ACCENTS.purple["--accent-color"];
    return accentValue;
  };

  // Create the context value
  const contextValue = {
    theme: "dark", // Always dark
    setTheme: () => {}, // No-op function since we always use dark theme
    accentColor,
    setAccentColor,
    accentRgb: getAccentRgb(),
    isLoading,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
