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
  const { themeName, accentColor, accentRgb } = useTheme();

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

  // Get loading screen background based on theme
  const getLoadingBackground = () => {
    switch (themeName) {
      case "dracula":
        return "bg-[#282a36]";
      case "plex":
        return "bg-black";
      case "onedark":
        return "bg-[#282c34]";
      case "nord":
        return "bg-[#2E3440]";
      case "hotline":
        return "bg-gradient-to-br from-[#f765b8] to-[#155fa5]";
      case "aquamarine":
        return "bg-gradient-to-br from-[#47918a] to-[#0b3161]";
      case "overseerr":
        return "bg-gradient-to-t from-[hsl(221,39%,11%)] to-[hsl(215,28%,17%)]";
      case "dark":
      default:
        return "bg-[#0a0c14]";
    }
  };

  // Get overlay background for certain themes
  const getThemeOverlay = () => {
    if (themeName === "plex") {
      return (
        <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
          <div
            className="w-full h-full"
            style={{
              background:
                "radial-gradient(circle farthest-side at 0% 100%, rgb(47, 47, 47) 0%, rgba(47, 47, 47, 0) 100%), radial-gradient(circle farthest-side at 100% 100%, rgb(63, 63, 63) 0%, rgba(63, 63, 63, 0) 100%), radial-gradient(circle farthest-side at 100% 0%, rgb(76, 76, 76) 0%, rgba(76, 76, 76, 0) 100%), radial-gradient(circle farthest-side at 0% 0%, rgb(58, 58, 58) 0%, rgba(58, 58, 58, 0) 100%), black",
            }}
          />
        </div>
      );
    }

    return null;
  };

  // Define accent color variables
  let accentFillColor, accentTextColor, accentBorderColor;

  // Set accent colors based on theme
  switch (themeName) {
    case "dracula":
      accentFillColor = "#bd93f9";
      accentTextColor = "#bd93f9";
      accentBorderColor = "rgba(189, 147, 249, 0.3)";
      break;
    case "plex":
      accentFillColor = "#e5a00d";
      accentTextColor = "#e5a00d";
      accentBorderColor = "rgba(229, 160, 13, 0.3)";
      break;
    case "onedark":
      accentFillColor = "#61afef";
      accentTextColor = "#61afef";
      accentBorderColor = "rgba(97, 175, 239, 0.3)";
      break;
    case "nord":
      accentFillColor = "#79b8ca";
      accentTextColor = "#79b8ca";
      accentBorderColor = "rgba(121, 184, 202, 0.3)";
      break;
    case "hotline":
      accentFillColor = "#f98dc9";
      accentTextColor = "#f98dc9";
      accentBorderColor = "rgba(249, 141, 201, 0.3)";
      break;
    case "aquamarine":
      accentFillColor = "#009688";
      accentTextColor = "#009688";
      accentBorderColor = "rgba(0, 150, 136, 0.3)";
      break;
    case "overseerr":
      accentFillColor = "#a78bfa";
      accentTextColor = "#a78bfa";
      accentBorderColor = "rgba(167, 139, 250, 0.3)";
      break;
    case "dark":
    default:
      // For dark theme, use the actual user-selected accent color
      accentFillColor = accentRgb ? `rgb(${accentRgb})` : "#a78bfa";
      accentTextColor = accentRgb ? `rgb(${accentRgb})` : "#a78bfa";
      accentBorderColor = accentRgb
        ? `rgba(${accentRgb}, 0.3)`
        : "rgba(167, 139, 250, 0.3)";
  }

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-50 ${getLoadingBackground()}`}
    >
      {/* Theme-specific background overlay */}
      {getThemeOverlay()}

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
          <div style={{ color: accentTextColor }} className="mr-3">
            <Icons.FilmIcon size={32} />
          </div>
          <h1 style={{ color: accentTextColor }} className="text-2xl font-bold">
            Plex & Tautulli Dashboard
          </h1>
        </div>

        {/* Current operation icon - dynamic based on loading message */}
        <div className="mb-3">
          <SectionIcon
            style={{ color: accentTextColor }}
            size={24}
            strokeWidth={1.5}
          />
        </div>

        {/* Loading spinner */}
        <div className="mb-6 relative">
          <LoadingIcon
            className={progress < 100 ? "animate-spin" : ""}
            style={{ color: accentTextColor }}
            size={48}
            strokeWidth={1.5}
          />

          {/* Show progress percentage in the middle of the spinner */}
          {progress > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                style={{ color: accentTextColor }}
                className="text-xs font-bold"
              >
                {Math.round(normalizedProgress)}%
              </span>
            </div>
          )}
        </div>

        {/* Progress bar with enhanced styling and using accent colors */}
        <div
          className="w-full h-3 bg-black/40 rounded-full mb-4 overflow-hidden"
          style={{ border: `1px solid ${accentBorderColor}` }}
        >
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${normalizedProgress}%`,
              backgroundColor: accentFillColor,
              boxShadow: `0 0 10px ${accentBorderColor}`,
            }}
          />
        </div>

        {/* Loading message */}
        <p
          style={{ color: accentTextColor }}
          className="text-center text-lg font-medium mb-2"
        >
          {message}
        </p>

        {/* Loading details - only show if we have details */}
        {details && (
          <p className="text-gray-400 text-sm text-center mb-4">{details}</p>
        )}

        {/* Additional loading message with helpful info */}
        <div
          className="flex items-center mt-6 bg-black/30 px-4 py-2 rounded-lg"
          style={{ border: `1px solid ${accentBorderColor}` }}
        >
          <div style={{ color: accentTextColor }} className="mr-2">
            <Icons.Info size={16} />
          </div>
          <p className="text-gray-300 text-sm">
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
            style={{ color: accentTextColor }}
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
