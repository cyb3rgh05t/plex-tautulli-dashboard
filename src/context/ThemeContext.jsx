import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";

// Define our theme options
const themes = {
  dark: "dark", // Default dark theme
  light: "light", // Light theme
  blue: "blue", // Blue accent theme (dark with blue accents)
  purple: "purple", // Purple accent theme (dark with purple accents)
  green: "green", // Green accent theme (dark with green accents)
};

// Theme color mappings for components to use
const themeColors = {
  dark: {
    primary: "#0070f3",
    secondary: "#5200f3",
    accent: "#3366FF",
    tabActive: "#374151",
    tabInactive: "#1f2937",
    tabHover: "#374151",
  },
  light: {
    primary: "#0070f3",
    secondary: "#5200f3",
    accent: "#3366FF",
    tabActive: "#e5e7eb",
    tabInactive: "#f3f4f6",
    tabHover: "#e5e7eb",
  },
  blue: {
    primary: "#0070f3",
    secondary: "#0053f3",
    accent: "#3366FF",
    tabActive: "#1d4ed8",
    tabInactive: "#1e3a8a",
    tabHover: "#1d4ed8",
  },
  purple: {
    primary: "#7000f3",
    secondary: "#b600f3",
    accent: "#9333EA",
    tabActive: "#7e22ce",
    tabInactive: "#581c87",
    tabHover: "#7e22ce",
  },
  green: {
    primary: "#00b467",
    secondary: "#00f3b7",
    accent: "#10B981",
    tabActive: "#059669",
    tabInactive: "#065f46",
    tabHover: "#059669",
  },
};

// Create the context
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Initialize theme from localStorage or default to 'dark'
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme && Object.keys(themes).includes(savedTheme)
      ? savedTheme
      : themes.dark;
  });

  // Add refresh counter to force component rerendering when needed
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Memoized function to change theme
  const changeTheme = useCallback((newTheme) => {
    if (Object.keys(themes).includes(newTheme)) {
      // Save to localStorage
      localStorage.setItem("theme", newTheme);

      // Update theme state
      setTheme(newTheme);

      // Force refresh counter to update
      setRefreshCounter((prev) => prev + 1);
    }
  }, []);

  // Get a human-readable theme name
  const getThemeName = useCallback((themeKey) => {
    const names = {
      dark: "Dark Mode",
      light: "Light Mode",
      blue: "Blue Accent",
      purple: "Purple Accent",
      green: "Green Accent",
    };
    return names[themeKey] || themeKey;
  }, []);

  // Get current theme colors
  const getThemeColors = useCallback(() => {
    return themeColors[theme] || themeColors.dark;
  }, [theme]);

  // Make available values and functions
  const value = {
    theme,
    themes: Object.keys(themes),
    themeColors: getThemeColors(),
    changeTheme,
    getThemeName,
    refreshCounter,
  };

  // Ensure document has the correct theme class on mount
  useEffect(() => {
    // Remove all theme classes first
    Object.values(themes).forEach((t) => {
      document.documentElement.classList.remove(t);
      document.body.classList.remove(t);
    });

    // Add current theme class
    document.documentElement.classList.add(theme);
    document.body.classList.add(theme);

    // Set data attribute for additional styling if needed
    document.documentElement.setAttribute("data-theme", theme);

    // Set CSS variables for theme colors
    const colors = themeColors[theme];
    Object.entries(colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--theme-${key}`, value);
    });
  }, [theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeContext;
