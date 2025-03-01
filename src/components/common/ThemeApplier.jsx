import { useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";

/**
 * This component ensures direct DOM manipulation to apply themes
 * when CSS variables and classes don't work reliably.
 * It also handles specific elements like format settings tabs.
 */
const ThemeApplier = () => {
  const { theme, refreshCounter, themeColors } = useTheme();

  // Apply theme whenever theme changes or refresh is triggered
  useEffect(() => {
    // Create a function to apply theme to format settings tabs
    const applyThemeToFormatTabs = () => {
      // Get format settings tab buttons (inside format settings component)
      const formatTabs = document.querySelectorAll(".format-settings-tab");
      if (formatTabs.length === 0) return;

      // Apply theme-specific styles to the tabs
      formatTabs.forEach((tab) => {
        const isActive = tab.classList.contains("active");

        // First reset any existing theme-specific classes
        tab.classList.remove(
          "bg-gray-700",
          "bg-gray-200",
          "bg-blue-500",
          "bg-purple-500",
          "bg-green-500",
          "text-white",
          "text-gray-800",
          "text-gray-400",
          "text-gray-600",
          "hover:bg-gray-700/50",
          "hover:bg-gray-100",
          "hover:bg-blue-700/50",
          "hover:bg-purple-700/50",
          "hover:bg-green-700/50"
        );

        // Apply new theme-specific styles
        if (isActive) {
          switch (theme) {
            case "light":
              tab.classList.add("bg-gray-200", "text-gray-800");
              break;
            case "blue":
              tab.classList.add("bg-blue-500", "text-white");
              break;
            case "purple":
              tab.classList.add("bg-purple-500", "text-white");
              break;
            case "green":
              tab.classList.add("bg-green-500", "text-white");
              break;
            default: // dark
              tab.classList.add("bg-gray-700", "text-white");
              break;
          }
        } else {
          // Non-active states
          switch (theme) {
            case "light":
              tab.classList.add(
                "text-gray-600",
                "hover:bg-gray-100",
                "hover:text-gray-800"
              );
              break;
            case "blue":
              tab.classList.add(
                "text-gray-400",
                "hover:bg-blue-700/50",
                "hover:text-white"
              );
              break;
            case "purple":
              tab.classList.add(
                "text-gray-400",
                "hover:bg-purple-700/50",
                "hover:text-white"
              );
              break;
            case "green":
              tab.classList.add(
                "text-gray-400",
                "hover:bg-green-700/50",
                "hover:text-white"
              );
              break;
            default: // dark
              tab.classList.add(
                "text-gray-400",
                "hover:bg-gray-700/50",
                "hover:text-white"
              );
              break;
          }
        }
      });
    };

    // Create function to set CSS variables for theme colors
    const setCssVariables = () => {
      document.documentElement.style.setProperty(
        "--theme-primary",
        themeColors.primary
      );
      document.documentElement.style.setProperty(
        "--theme-secondary",
        themeColors.secondary
      );
      document.documentElement.style.setProperty(
        "--theme-accent",
        themeColors.accent
      );
      document.documentElement.style.setProperty(
        "--theme-tab-active",
        themeColors.tabActive
      );
      document.documentElement.style.setProperty(
        "--theme-tab-inactive",
        themeColors.tabInactive
      );
      document.documentElement.style.setProperty(
        "--theme-tab-hover",
        themeColors.tabHover
      );
    };

    // Function to apply all theme changes
    const applyAllThemeChanges = () => {
      setCssVariables();

      // Use a setTimeout to ensure DOM elements are fully rendered
      setTimeout(() => {
        applyThemeToFormatTabs();
      }, 100);
    };

    // Apply changes initially
    applyAllThemeChanges();

    // Set up a mutation observer to watch for DOM changes
    const observer = new MutationObserver(() => {
      applyThemeToFormatTabs();
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Cleanup observer on unmount
    return () => observer.disconnect();
  }, [theme, refreshCounter, themeColors]);

  // This component doesn't render anything
  return null;
};

export default ThemeApplier;
