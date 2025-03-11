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

// Theme definitions (new)
const THEMES = {
  dark: {
    name: "Darker",
    description: "Darker version of the default theme",
    isDefault: true,
  },
  dracula: {
    name: "Dracula",
    description: "Dark theme with vivid colors",
  },
  plex: {
    name: "Plex",
    description: "Inspired by Plex Media Server",
  },
  overseerr: {
    name: "Overseerr",
    description: "Inspired by Overseerr UI",
  },
  onedark: {
    name: "One Dark",
    description: "Based on Atom One Dark",
  },
  nord: {
    name: "Nord",
    description: "Cool blue polar theme",
  },
  hotline: {
    name: "Hotline",
    description: "Vibrant pink and blue gradient",
  },
  aquamarine: {
    name: "Aquamarine",
    description: "Teal and blue gradient",
  },
};

// Default values
const DEFAULT_ACCENT_COLOR = "purple";
const DEFAULT_THEME = "dark";
const VALID_ACCENTS = Object.keys(ACCENTS);
const VALID_THEMES = Object.keys(THEMES);
const ACCENT_STORAGE_KEY = "accentColor";
const THEME_STORAGE_KEY = "themeName";

// Storage helper functions
const getStoredAccent = () => {
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    return VALID_ACCENTS.includes(stored) ? stored : DEFAULT_ACCENT_COLOR;
  } catch (error) {
    logError("Error reading accent from localStorage:", error);
    return DEFAULT_ACCENT_COLOR;
  }
};

const getStoredTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return VALID_THEMES.includes(stored) ? stored : DEFAULT_THEME;
  } catch (error) {
    logError("Error reading theme from localStorage:", error);
    return DEFAULT_THEME;
  }
};

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    logError(`Error saving ${key} to localStorage:`, error);
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
  // State for accent color and theme
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR);
  const [themeName, setThemeName] = useState(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(true);

  // Internal function to set accent color and save to storage
  const handleAccentChange = (accent) => {
    if (!VALID_ACCENTS.includes(accent)) {
      logError(`Invalid accent color: ${accent}`);
      return;
    }

    // Only allow changing accent color for dark theme
    if (themeName === "dark") {
      setAccentColor(accent);
      setDarkThemeAccent(accent);
      saveToStorage(ACCENT_STORAGE_KEY, accent);
    } else {
      logInfo("Accent color can only be changed in Dark theme");
      // Keep the theme's default accent
    }
  };

  // Get the default accent color for a theme
  const getThemeDefaultAccent = (theme) => {
    switch (theme) {
      case "dracula":
        return "purple"; // Dracula uses purple accent by default
      case "plex":
        return "orange"; // Plex uses orange accent
      case "overseerr":
        return "purple"; // Overseerr uses purple accent
      case "onedark":
        return "blue"; // OneDark uses blue accent
      case "nord":
        return "blue"; // Nord uses blue accent
      case "hotline":
        return "maroon"; // Hotline uses pink/maroon
      case "aquamarine":
        return "green"; // Aquamarine uses green accent
      default:
        return accentColor; // Dark theme can use any accent
    }
  };

  // Store the user's custom accent color for dark theme
  const [darkThemeAccent, setDarkThemeAccent] = useState(accentColor);

  // Internal function to set theme and save to storage
  const handleThemeChange = (theme) => {
    if (!VALID_THEMES.includes(theme)) {
      logError(`Invalid theme: ${theme}`);
      return;
    }

    // If switching to dark theme, restore the user's custom accent
    if (theme === "dark") {
      setAccentColor(darkThemeAccent);
    } else {
      // If switching to another theme, store current accent and use theme's default
      if (themeName === "dark") {
        setDarkThemeAccent(accentColor);
      }
      setAccentColor(getThemeDefaultAccent(theme));
    }

    setThemeName(theme);
    saveToStorage(THEME_STORAGE_KEY, theme);
  };

  // Load saved preferences from localStorage
  useEffect(() => {
    try {
      // Ensure we're in a browser environment
      if (typeof localStorage === "undefined") {
        logDebug("localStorage not available, using default theme settings");
        setIsLoading(false);
        return;
      }

      // Get stored values
      const storedAccent = getStoredAccent();
      const storedTheme = getStoredTheme();

      // Apply stored values
      setAccentColor(storedAccent);
      setThemeName(storedTheme);

      logInfo("Theme preferences loaded", {
        accent: storedAccent,
        theme: storedTheme,
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

      // Apply theme class to HTML element
      // First remove all possible theme classes
      const allThemeClasses = VALID_THEMES.map((theme) => `theme-${theme}`);
      htmlElement.classList.remove(...allThemeClasses);
      bodyElement.classList.remove(...allThemeClasses);

      // Add the selected theme class to both html and body
      htmlElement.classList.add(`theme-${themeName}`);
      bodyElement.classList.add(`theme-${themeName}`);

      // Always add dark mode for Tailwind
      htmlElement.classList.add("dark");

      // Apply accent classes - remove all possible classes first
      const allAccentClasses = VALID_ACCENTS.map(
        (accent) => `accent-${accent}`
      );
      allAccentClasses.push("accent-default"); // Add legacy class
      htmlElement.classList.remove(...allAccentClasses);
      htmlElement.classList.add(`accent-${accentColor}`);

      // Set data attributes for easy inspection
      htmlElement.setAttribute("data-theme", themeName);
      htmlElement.setAttribute("data-accent", accentColor);

      logInfo("Applied theme via CSS classes", { themeName, accentColor });
    } catch (error) {
      logError("Failed to apply theme:", error);
    }
  }, [accentColor, themeName, isLoading]);

  // Function to get accent RGB values based on current accent
  const getAccentRgb = () => {
    return ACCENTS[accentColor]?.rgb || ACCENTS.purple.rgb;
  };

  // Create the context value
  const contextValue = {
    // Accent color properties
    accentColor,
    setAccentColor: handleAccentChange,
    accentRgb: getAccentRgb(),
    accentName: ACCENTS[accentColor]?.name || "Purple",
    allAccents: ACCENTS,

    // Theme properties
    themeName,
    setThemeName: handleThemeChange,
    themeDisplayName: THEMES[themeName]?.name || "Dark",
    themeDescription: THEMES[themeName]?.description || "Default theme",
    allThemes: THEMES,

    // Status
    isLoading,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
