import React from "react";
import { useTheme } from "../../context/ThemeContext";
import * as Icons from "lucide-react";

/**
 * Enhanced loading screen component with improved progress bar and detailed information
 * specifically optimized for showing the preloading process of the Recently Added content
 */
const LoadingScreen = ({
  progress = 0,
  message = "Loading...",
  details = "",
}) => {
  const { accentRgb } = useTheme();

  // Generate gradient background color based on accent
  const gradientBg = `linear-gradient(135deg, rgba(${accentRgb}, 0.1) 0%, rgba(31, 41, 55, 0.7) 100%)`;

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
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-900 z-50">
      {/* Background with subtle pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Content container */}
      <div className="relative z-10 flex flex-col items-center justify-center p-8 max-w-md w-full">
        {/* Logo/Brand */}
        <div className="mb-8 flex items-center">
          <div className="text-accent-base mr-3">
            <Icons.FilmIcon size={32} />
          </div>
          <h1 className="text-white text-2xl font-bold">Plex Dashboard</h1>
        </div>

        {/* Current operation icon - dynamic based on loading message */}
        <div className="mb-3">
          <SectionIcon
            className="text-accent-base"
            size={24}
            strokeWidth={1.5}
          />
        </div>

        {/* Loading spinner */}
        <div className="mb-6 relative">
          <LoadingIcon
            className={
              progress < 100
                ? "animate-spin text-accent-base"
                : "text-accent-base"
            }
            size={48}
            strokeWidth={1.5}
          />

          {/* Show progress percentage in the middle of the spinner */}
          {progress > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-accent-base text-xs font-bold">
                {Math.round(normalizedProgress)}%
              </span>
            </div>
          )}
        </div>

        {/* Progress bar with enhanced styling */}
        <div className="w-full h-2 bg-gray-800 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${normalizedProgress}%`,
              background: `rgba(${accentRgb}, 0.7)`,
              boxShadow: `0 0 10px rgba(${accentRgb}, 0.5)`,
            }}
          />
        </div>

        {/* Loading message */}
        <p className="text-white text-center text-lg font-medium mb-2">
          {message}
        </p>

        {/* Loading details - only show if we have details */}
        {details && (
          <p className="text-gray-400 text-sm text-center mb-4">{details}</p>
        )}

        {/* Additional loading message with helpful info */}
        <div className="flex items-center mt-6 bg-gray-800 bg-opacity-40 px-4 py-2 rounded-lg border border-accent/20">
          <Icons.Info size={16} className="text-accent-base mr-2" />
          <p className="text-gray-300 text-sm">
            {progress < 25
              ? "Initializing dashboard and checking configuration..."
              : progress < 50
              ? "Loading library sections and recently added media..."
              : progress < 75
              ? "Fetching enhanced metadata and TMDB posters..."
              : progress < 100
              ? "Finalizing and preparing interface..."
              : "Loading complete! Preparing dashboard..."}
          </p>
        </div>

        {/* Tip for a better experience with more emphasis on poster loading */}
        {progress > 20 && progress < 90 && (
          <div className="mt-3 text-xs text-accent-base/80 text-center max-w-xs">
            {progress >= 70 && progress < 90
              ? "Fetching high-quality TMDB posters to replace default Plex thumbnails for a better visual experience."
              : "The dashboard is preloading all library content and metadata for instant browsing. This may take a moment but only happens once."}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
