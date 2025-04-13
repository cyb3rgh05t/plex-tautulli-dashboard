import React from "react";
import { useTheme } from "../../context/ThemeContext";
import * as Icons from "lucide-react";
import Logo from "../common/Logo"; // Import the Logo component

/**
 * Enhanced loading screen component with improved progress bar and detailed information
 * specifically optimized for showing the preloading process of the Recently Added content
 * Updated to use CSS variables from theme system for consistent styling
 */
const LoadingScreen = ({
  progress = 0,
  message = "Loading...",
  details = "",
}) => {
  const { themeName } = useTheme();

  // Ensure progress is between 0-100
  const normalizedProgress = Math.min(100, Math.max(0, progress));

  // Choose proper loading icon based on progress
  const LoadingIcon = progress >= 100 ? Icons.CheckCircle : Icons.Loader2;

  // Determine which section icon to show based on loading message
  let SectionIcon = Icons.Library;
  if (message.includes("metadata") || message.includes("TMDB")) {
    SectionIcon = Icons.FileText;
  } else if (message.includes("media")) {
    SectionIcon = Icons.Film;
  } else if (message.includes("poster") || message.includes("thumbnail")) {
    SectionIcon = Icons.Image;
  } else if (message.includes("configuration")) {
    SectionIcon = Icons.Settings;
  }

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-50 theme-${themeName}`}
      style={{
        background: "var(--main-bg-color)",
        color: "var(--text)",
      }}
    >
      {/* Special case for cyberpunk theme - add grid overlay */}
      {themeName === "cyberpunk" && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(191, 0, 255, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(191, 0, 255, 0.05) 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />
      )}

      {/* Subtle noise texture overlay - works with all themes */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          mixBlendMode: "overlay",
        }}
      />

      {/* Content container */}
      <div className="relative z-10 flex flex-col items-center justify-center p-8 max-w-md w-full">
        {/* Logo/Brand */}
        <div className="mb-8 flex items-center">
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(var(--accent-color), 0.2) 0%, rgba(var(--accent-color), 0.1) 100%)",
              border: "1px solid rgba(var(--accent-color), 0.3)",
            }}
            className="mr-3"
          >
            {/* Replace the grid icon with our custom Logo */}
            <Logo
              size={22}
              fillColor="transparent"
              strokeColor="rgb(var(--accent-color))"
            />
          </div>
          <h1 className="text-2xl font-bold">Plex & Tautulli Dashboard</h1>
        </div>

        {/* Current operation icon - dynamic based on loading message */}
        <div className="mb-3">
          <SectionIcon
            style={{ color: "var(--accent-color-base, var(--link-color))" }}
            size={24}
            strokeWidth={1.5}
          />
        </div>

        {/* Loading spinner */}
        <div className="mb-6 relative">
          <LoadingIcon
            className={progress < 100 ? "animate-spin" : ""}
            style={{ color: "var(--accent-color-base, var(--link-color))" }}
            size={48}
            strokeWidth={1.5}
          />

          {/* Show progress percentage in the middle of the spinner */}
          {progress > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold">
                {Math.round(normalizedProgress)}%
              </span>
            </div>
          )}
        </div>

        {/* Progress bar with enhanced styling and using accent colors */}
        <div
          className="w-full h-3 bg-black/40 rounded-full mb-4 overflow-hidden"
          style={{
            border:
              "1px solid var(--accent-color-border, rgba(var(--accent-color), 0.3))",
          }}
        >
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${normalizedProgress}%`,
              backgroundColor: "var(--button-color)",
              boxShadow:
                "0 0 10px var(--accent-color-border, rgba(var(--accent-color), 0.3))",
            }}
          />
        </div>

        {/* Loading message */}
        <p className="text-center text-lg font-medium mb-2">{message}</p>

        {/* Loading details - only show if we have details */}
        {details && (
          <p
            style={{ color: "var(--text-muted)" }}
            className="text-sm text-center mb-4"
          >
            {details}
          </p>
        )}

        {/* Additional loading message with helpful info */}
        <div
          className="flex items-center mt-6 bg-black/30 px-4 py-2 rounded-lg"
          style={{
            border:
              "1px solid var(--accent-color-border, rgba(var(--accent-color), 0.3))",
          }}
        >
          <div
            style={{ color: "var(--accent-color-base, var(--link-color))" }}
            className="mr-2"
          >
            <Icons.Info size={16} />
          </div>
          <p style={{ color: "var(--text)" }} className="text-sm">
            {progress < 25
              ? "Initializing dashboard and checking configuration..."
              : progress < 50
              ? "Fetching enhanced metadata and artwork..."
              : progress < 85
              ? "Loading library sections and recently added media..."
              : progress < 100
              ? "Finalizing and preparing interface..."
              : "Loading complete! Preparing dashboard..."}
          </p>
        </div>

        {/* Tip for a better experience with more emphasis on poster loading */}
        {progress > 20 && progress < 90 && (
          <div
            className="mt-3 text-xs text-center max-w-xs"
            style={{ color: "var(--accent-color-base, var(--link-color))" }}
          >
            {progress >= 70 && progress < 90
              ? "Downloading Plex thumbnails for a better visual experience."
              : "The dashboard is preloading all library content and metadata for instant browsing. This may take a moment but only happens once."}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
