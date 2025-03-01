import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../../context/ThemeContext";
import { Moon, Sun, Circle, ChevronDown, Check } from "lucide-react";

const ThemeSelector = () => {
  const { theme, themes, changeTheme, getThemeName } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, right: 0 });

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  // Update button position when the dropdown opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.bottom + window.scrollY,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  // Get the appropriate icon for each theme
  const getThemeIcon = (themeKey) => {
    switch (themeKey) {
      case "light":
        return <Sun size={16} />;
      case "dark":
        return <Moon size={16} />;
      case "blue":
        return <Circle size={16} className="text-blue-500" />;
      case "purple":
        return <Circle size={16} className="text-purple-500" />;
      case "green":
        return <Circle size={16} className="text-green-500" />;
      default:
        return <Circle size={16} />;
    }
  };

  const handleThemeChange = (newTheme) => {
    changeTheme(newTheme);
    closeDropdown();
  };

  // Create a portal target if it doesn't exist
  useEffect(() => {
    if (!document.getElementById("dropdown-root")) {
      const portalRoot = document.createElement("div");
      portalRoot.id = "dropdown-root";
      document.body.appendChild(portalRoot);
    }

    return () => {
      const portalRoot = document.getElementById("dropdown-root");
      if (portalRoot && portalRoot.childNodes.length === 0) {
        document.body.removeChild(portalRoot);
      }
    };
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {getThemeIcon(theme)}
        <span className="hidden md:inline">{getThemeName(theme)}</span>
        <ChevronDown size={16} className={isOpen ? "rotate-180" : ""} />
      </button>

      {isOpen &&
        createPortal(
          <>
            {/* Backdrop for closing dropdown */}
            <div
              className="fixed inset-0 z-[9000]"
              onClick={closeDropdown}
              style={{ backgroundColor: "transparent" }}
            />

            {/* Dropdown menu */}
            <div
              className="shadow-lg py-1 rounded-lg z-[9999]"
              style={{
                position: "fixed",
                top: `${buttonPosition.top}px`,
                right: `${buttonPosition.right}px`,
                width: "200px",
                backgroundColor: theme === "light" ? "#f7fafc" : "#2d3748",
                border: `1px solid ${
                  theme === "light" ? "#e2e8f0" : "#4a5568"
                }`,
              }}
            >
              {themes.map((themeOption) => (
                <button
                  key={themeOption}
                  onClick={() => handleThemeChange(themeOption)}
                  className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-opacity-30"
                  style={{
                    color: theme === "light" ? "#1f2937" : "#e2e8f0",
                    backgroundColor:
                      theme === themeOption
                        ? theme === "light"
                          ? "rgba(226, 232, 240, 0.5)"
                          : "rgba(74, 85, 104, 0.5)"
                        : "transparent",
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {getThemeIcon(themeOption)}
                      <span>{getThemeName(themeOption)}</span>
                    </div>
                    {theme === themeOption && (
                      <Check
                        size={16}
                        style={{ color: "var(--color-primary-400)" }}
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>,
          document.getElementById("dropdown-root") || document.body
        )}
    </div>
  );
};

export default ThemeSelector;
