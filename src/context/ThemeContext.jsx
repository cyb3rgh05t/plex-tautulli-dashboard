import React, { createContext, useState, useEffect, useContext } from "react";
import { logInfo, logError, logDebug } from "../utils/logger";

// Create context
const ThemeContext = createContext(null);

// Accent color definitions
const ACCENTS = {
  purple: {
    name: "Purple",
    rgb: "167, 139, 250",
  },
  grey: {
    name: "Grey",
    rgb: "220, 220, 220",
  },
  green: {
    name: "Green",
    rgb: "109, 247, 81",
  },
  maroon: {
    name: "Maroon",
    rgb: "166, 40, 140",
  },
  orange: {
    name: "Orange",
    rgb: "255, 153, 0",
  },
  blue: {
    name: "Blue",
    rgb: "0, 98, 255",
  },
  red: {
    name: "Red",
    rgb: "232, 12, 11",
  },
};

// Default values
const DEFAULT_ACCENT_COLOR = "purple";
const VALID_ACCENTS = Object.keys(ACCENTS);
const STORAGE_KEY = "accentColor";

// Storage helper functions
const getStoredAccent = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID_ACCENTS.includes(stored) ? stored : DEFAULT_ACCENT_COLOR;
  } catch (error) {
    logError("Error reading accent from localStorage:", error);
    return DEFAULT_ACCENT_COLOR;
  }
};

const saveToStorage = (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, value);
    return true;
  } catch (error) {
    logError(`Error saving accent to localStorage:`, error);
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
  // State for accent color
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preferences from localStorage
  useEffect(() => {
    try {
      // Ensure we're in a browser environment
      if (typeof localStorage === "undefined") {
        logDebug("localStorage not available, using default theme settings");
        setIsLoading(false);
        return;
      }

      // Get stored accent
      const storedAccent = getStoredAccent();

      // Apply stored value
      setAccentColor(storedAccent);

      logInfo("Theme preferences loaded", {
        accent: storedAccent,
      });
    } catch (error) {
      logError("Failed to load theme preferences:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Apply theme directly with CSS classes
  useEffect(() => {
    if (isLoading) return;

    // Safety check for browser environment
    if (typeof document === "undefined") {
      logDebug("Document not available, skipping theme application");
      return;
    }

    try {
      // Get document HTML element with safety checks
      const htmlElement = document.documentElement;
      const bodyElement = document.body;

      if (!htmlElement || !bodyElement) {
        logError("HTML or Body element not found for theme application");
        return;
      }

      // Apply dark theme class
      htmlElement.classList.add("theme-dark");
      htmlElement.classList.add("dark"); // For Tailwind dark mode

      // Apply accent classes - remove all possible classes first
      const allAccentClasses = VALID_ACCENTS.map(
        (accent) => `accent-${accent}`
      );
      allAccentClasses.push("accent-default"); // Add legacy class
      htmlElement.classList.remove(...allAccentClasses);
      htmlElement.classList.add(`accent-${accentColor}`);

      // Set data attributes for easy inspection
      htmlElement.setAttribute("data-theme", "dark");
      htmlElement.setAttribute("data-accent", accentColor);

      // Save preferences to localStorage
      saveToStorage(accentColor);

      logInfo("Applied theme via CSS classes", { accentColor });
    } catch (error) {
      logError("Failed to apply theme:", error);
    }
  }, [accentColor, isLoading]);

  // Function to get accent RGB values based on current accent
  const getAccentRgb = () => {
    return ACCENTS[accentColor]?.rgb || ACCENTS.purple.rgb;
  };

  // Create the context value
  const contextValue = {
    accentColor,
    setAccentColor,
    accentRgb: getAccentRgb(),
    accentName: ACCENTS[accentColor]?.name || "Purple",
    allAccents: ACCENTS,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
