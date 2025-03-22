import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Palette, Check, AlertCircle, X } from "lucide-react";

/**
 * An improved theme toggle component that shows accent colors in a modal
 * @param {Object} props
 * @param {'simple'|'full'} props.variant - Display variant (simple for icon-only, full for expanded)
 * @param {boolean} props.showAccent - Whether to show accent color options
 */
const ThemeToggle = ({ variant = "simple", showAccent = true }) => {
  const { accentColor, setAccentColor, allAccents, themeName } = useTheme();
  const [showAccentModal, setShowAccentModal] = useState(false);
  const modalRef = useRef(null);

  // Only allow accent customization for dark theme
  const canCustomizeAccent = themeName === "dark";

  // Close modal when clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowAccentModal(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        setShowAccentModal(false);
      }
    };

    if (showAccentModal) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showAccentModal]);

  // Render accent color modal
  const renderAccentColorModal = () => {
    const accentColors = Object.entries(allAccents).map(([id, details]) => ({
      id,
      name: details.name,
      rgb: details.rgb,
    }));

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div
          ref={modalRef}
          className="relative max-w-2xl w-full rounded-xl shadow-lg border border-accent bg-gray-900/95 p-6"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Palette size={20} className="text-accent" />
              <h3 className="text-xl font-medium text-white">Accent Color</h3>
            </div>
            <button
              onClick={() => setShowAccentModal(false)}
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800"
            >
              <X size={20} />
            </button>
          </div>

          {canCustomizeAccent ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {accentColors.map((color) => (
                <button
                  key={color.id}
                  className={`
                    flex flex-col items-center p-4 rounded-lg transition-theme
                    ${
                      accentColor === color.id
                        ? "border-2 border-white/80"
                        : "border border-accent"
                    }
                    hover:bg-white/10 hover:border-white/40
                  `}
                  style={{
                    backgroundColor:
                      accentColor === color.id
                        ? `rgba(${color.rgb}, 0.2)`
                        : "transparent",
                  }}
                  onClick={() => {
                    setAccentColor(color.id);
                    setShowAccentModal(false);
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-full mb-3 flex items-center justify-center transition-all group-hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, rgba(${color.rgb}, 0.8) 0%, rgba(${color.rgb}, 0.4) 100%)`,
                      boxShadow:
                        accentColor === color.id
                          ? `0 0 15px rgba(${color.rgb}, 0.6)`
                          : "none",
                    }}
                  >
                    {accentColor === color.id && (
                      <Check size={24} className="text-white" />
                    )}
                  </div>
                  <span className="text-white text-sm font-medium transition-all group-hover:text-opacity-80">
                    {color.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-5 bg-gray-800/50 rounded-lg border border-accent/30 mb-2">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={20} className="text-accent" />
                <h4 className="text-lg font-medium text-white">
                  Theme-Defined Accent
                </h4>
              </div>
              <p className="text-gray-300 mb-4">
                Custom accent colors are only available in Dark theme. Switch to
                Dark theme to customize accents.
              </p>
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, rgba(var(--accent-color), 0.8) 0%, rgba(var(--accent-color), 0.4) 100%)`,
                  }}
                ></div>
                <div>
                  <p className="text-white font-medium">
                    {themeName.charAt(0).toUpperCase() + themeName.slice(1)}{" "}
                    Theme
                  </p>
                  <p className="text-sm text-gray-400">
                    Uses predefined accent colors
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Simple variant just shows the accent toggle button
  if (variant === "simple") {
    return (
      <div className="relative">
        {showAccent && (
          <button
            onClick={() => setShowAccentModal(!showAccentModal)}
            className={`text-gray-400 hover:text-white transition-theme p-2 rounded-lg hover:bg-gray-700/50 ${
              !canCustomizeAccent ? "opacity-60" : ""
            }`}
            title={
              canCustomizeAccent
                ? "Change accent color"
                : "Theme-defined accent color"
            }
          >
            <Palette size={20} />
          </button>
        )}

        {/* Accent color modal */}
        {showAccent && showAccentModal && renderAccentColorModal()}
      </div>
    );
  }

  // Full variant shows more options
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Accent color selector button */}
        {showAccent && (
          <button
            onClick={() => setShowAccentModal(!showAccentModal)}
            className={`flex items-center gap-2 px-3 py-2 
              ${
                canCustomizeAccent
                  ? "bg-gray-800/50 hover:bg-gray-800"
                  : "bg-gray-800/30"
              }
              text-gray-300 hover:text-white 
              rounded-lg transition-theme border border-accent
              ${!canCustomizeAccent ? "opacity-80" : ""}`}
            title={
              canCustomizeAccent
                ? "Change accent color"
                : "Theme-defined accent color"
            }
          >
            <Palette size={18} className="text-accent" />
            <div
              className="w-3 h-3 rounded-full"
              style={{
                background: `rgb(${
                  allAccents[accentColor]?.rgb || allAccents.purple.rgb
                })`,
              }}
            />
            {!canCustomizeAccent && (
              <span className="text-xs ml-1 opacity-70">Theme-defined</span>
            )}
          </button>
        )}
      </div>

      {/* Accent color modal */}
      {showAccent && showAccentModal && renderAccentColorModal()}
    </div>
  );
};

export default ThemeToggle;
