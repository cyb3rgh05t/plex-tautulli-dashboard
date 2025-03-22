import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Palette, Check, Monitor, X } from "lucide-react";
import ReactDOM from "react-dom";

/**
 * A fully fixed theme selector component with properly centered modal
 * @param {'simple'|'full'} variant - Display variant (simple for icon-only, full for expanded)
 */
const ThemeSelector = ({ variant = "full" }) => {
  const { themeName, setThemeName, accentColor, allThemes } = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const modalRef = useRef(null);

  // Close modal when clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowThemeModal(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        setShowThemeModal(false);
      }
    };

    if (showThemeModal) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
      // Prevent scrolling of the body when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
      // Restore scrolling when modal is closed
      document.body.style.overflow = "";
    };
  }, [showThemeModal]);

  // Get theme preview color based on theme name
  const getThemePreviewColors = (theme) => {
    switch (theme) {
      case "dark":
        return {
          primary: "#0a0c14",
          secondary: "#141824",
          accent: `rgb(var(--accent-color))`,
        };
      case "dracula":
        return {
          primary: "#282a36",
          secondary: "#1e2029",
          accent: "#bd93f9",
        };
      case "plex":
        return {
          primary: "#1f1f1f",
          secondary: "#282828",
          accent: "#e5a00d",
        };
      case "overseerr":
        return {
          primary: "#111827",
          secondary: "#1f2937",
          accent: "#4f46e5",
        };
      case "onedark":
        return {
          primary: "#282c34",
          secondary: "#1e222a",
          accent: "#61afef",
        };
      case "nord":
        return {
          primary: "#2E3440",
          secondary: "#3B4252",
          accent: "#79b8ca",
        };
      case "hotline":
        return {
          primary: "#f765b8",
          secondary: "#155fa5",
          accent: "#f98dc9",
        };
      case "aquamarine":
        return {
          primary: "#47918a",
          secondary: "#0b3161",
          accent: "#009688",
        };
      case "spacegray":
        return {
          primary: "#576c75",
          secondary: "#253237",
          accent: "#81a6b7",
        };
      case "organizr":
        return {
          primary: "#1f1f1f",
          secondary: "#333333",
          accent: "#2cabe3",
        };
      case "maroon":
        return {
          primary: "#4c1533",
          secondary: "#220a25",
          accent: "#a21c65",
        };
      case "hotpink":
        return {
          primary: "#fb3f62",
          secondary: "#204c80",
          accent: "#fb3f62",
        };
      case "cyberpunk":
        return {
          primary: "#160133",
          secondary: "#06021a",
          accent: "#bf00ff",
          highlight: "#e0ff00",
        };
      default:
        return {
          primary: "#0a0c14",
          secondary: "#141824",
          accent: `rgb(var(--accent-color))`,
        };
    }
  };

  // Render theme modal - using portal to render at the body level
  const renderThemeModal = () => {
    if (!showThemeModal) return null;

    const themeOptions = Object.entries(allThemes).map(([id, details]) => ({
      id,
      name: details.name,
      description: details.description,
    }));

    const modal = (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <div
          ref={modalRef}
          className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-lg border border-accent bg-gray-900/95 p-6"
          style={{ margin: "0 auto" }}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Monitor size={20} className="text-accent" />
              <h3 className="text-xl font-medium text-white">Theme Presets</h3>
            </div>
            <button
              onClick={() => setShowThemeModal(false)}
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800"
            >
              <X size={20} />
            </button>
          </div>

          {/* Theme Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {themeOptions.map((theme) => {
              const colors = getThemePreviewColors(theme.id);
              return (
                <button
                  key={theme.id}
                  className={`
                    flex flex-col items-center p-4 rounded-lg transition-theme
                    ${
                      themeName === theme.id
                        ? "bg-accent-light/20 border-2 border-white/80"
                        : "border border-accent"
                    }
                    hover:bg-white/10 hover:border-white/40
                  `}
                  onClick={() => {
                    setThemeName(theme.id);
                    setShowThemeModal(false);
                  }}
                >
                  {/* Theme preview swatch */}
                  <div className="w-full h-24 mb-3 rounded-md overflow-hidden shadow-md relative">
                    {/* Gradient or solid background */}
                    {[
                      "hotline",
                      "aquamarine",
                      "hotpink",
                      "cyberpunk",
                      "spacegray",
                      "maroon",
                    ].includes(theme.id) ? (
                      <div
                        className="w-full h-full"
                        style={{
                          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                        }}
                      >
                        {/* For cyberpunk, add grid overlay */}
                        {theme.id === "cyberpunk" && (
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage: `linear-gradient(${colors.accent}20 1px, transparent 1px), 
                                              linear-gradient(90deg, ${colors.accent}20 1px, transparent 1px)`,
                              backgroundSize: "10px 10px",
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{ background: colors.primary }}
                      />
                    )}

                    {/* Special elements for cyberpunk theme */}
                    {theme.id === "cyberpunk" && (
                      <>
                        <div
                          className="absolute top-2 left-2 w-6 h-1"
                          style={{ background: colors.highlight }}
                        />
                        <div
                          className="absolute top-2 right-2 w-1 h-6"
                          style={{ background: colors.accent }}
                        />
                        <div
                          className="absolute bottom-2 right-2 w-6 h-1"
                          style={{ background: colors.highlight }}
                        />
                        <div
                          className="absolute bottom-2 left-2 w-1 h-6"
                          style={{ background: colors.accent }}
                        />
                      </>
                    )}

                    {/* Accent color strip */}
                    <div
                      className="absolute bottom-0 left-0 w-full h-3"
                      style={{ background: colors.accent }}
                    />

                    {/* Selected indicator */}
                    {themeName === theme.id && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white/20 rounded-full p-1">
                          <Check size={18} className="text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Theme info */}
                  <div className="text-center">
                    <span className="text-white text-sm font-medium block">
                      {theme.name}
                    </span>
                    <span className="text-gray-400 text-xs block mt-1">
                      {theme.description}
                    </span>
                    {theme.id === "dark" && (
                      <span className="text-accent-base text-xs block mt-1">
                        Supports custom accents
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );

    // Use portal to render the modal at the document body level
    return ReactDOM.createPortal(modal, document.body);
  };

  // Simple variant (icon only)
  if (variant === "simple") {
    return (
      <>
        <button
          onClick={() => setShowThemeModal(true)}
          className="text-gray-400 hover:text-white transition-theme p-2 rounded-lg hover:bg-gray-700/50"
          title="Change theme"
        >
          <Monitor size={20} />
        </button>

        {/* Theme modal */}
        {renderThemeModal()}
      </>
    );
  }

  // Full variant with text
  return (
    <>
      <button
        onClick={() => setShowThemeModal(true)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 text-gray-300 hover:text-white hover:bg-gray-800 
          rounded-lg transition-theme border border-accent"
        title="Change theme"
      >
        <Monitor size={18} className="text-accent" />
        <span className="text-sm font-medium">Theme</span>
      </button>

      {/* Theme modal */}
      {renderThemeModal()}
    </>
  );
};

export default ThemeSelector;
