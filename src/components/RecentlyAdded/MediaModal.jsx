import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import * as Icons from "lucide-react";
import ThemedButton from "../common/ThemedButton";
import { useTheme } from "../../context/ThemeContext.jsx";
import axios from "axios";
import { logError, logInfo, logDebug, logWarn } from "../../utils/logger";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

const MediaModal = ({ media, onClose, apiKey }) => {
  const { accentRgb } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCast, setShowCast] = useState(false);
  const [mediaDetails, setMediaDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch additional media details when modal opens
  useEffect(() => {
    const fetchMediaDetails = async () => {
      if (!media || !media.rating_key) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await axios.get(`/api/tautulli/api/v2`, {
          params: {
            apikey: apiKey,
            cmd: "get_metadata",
            rating_key: media.rating_key,
            include_children: true,
          },
        });

        if (response.data?.response?.result === "success") {
          // Merge metadata with existing media props
          const enhancedMedia = {
            ...media,
            ...response.data.response.data,
            // Extract media info details if available
            ...(response.data.response.data?.media_info?.[0] || {}),
          };
          setMediaDetails(enhancedMedia);
        } else {
          setMediaDetails(media); // Use original media data as fallback
        }
      } catch (error) {
        logError("Error fetching media details:", error);
        setMediaDetails(media); // Use original media data as fallback
      } finally {
        setIsLoading(false);
      }
    };

    fetchMediaDetails();
  }, [media, apiKey]);

  // Create modal root if it doesn't exist
  useEffect(() => {
    let modalRoot = document.getElementById("modal-root");
    if (!modalRoot) {
      modalRoot = document.createElement("div");
      modalRoot.id = "modal-root";
      document.body.appendChild(modalRoot);
    }
    return () => {
      if (modalRoot && !modalRoot.childNodes.length) {
        document.body.removeChild(modalRoot);
      }
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Lock scroll
  useEffect(() => {
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    const scrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.paddingRight = "0px";
      window.scrollTo(0, scrollY);
    };
  }, []);

  if (!media) return null;

  // Use mediaDetails if available, otherwise fall back to the original media object
  const displayData = mediaDetails || media;

  const getBackgroundUrl = () => {
    if (!displayData.art) return null;
    return `/api/tautulli/pms_image_proxy?img=${encodeURIComponent(
      displayData.art
    )}&apikey=${apiKey}`;
  };

  const formatDuration = (ms) => {
    if (!ms) return "";
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${remainingMinutes}m`;
  };

  const formatDate = (timestamp, format = "default") => {
    if (!timestamp) return "";
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Get quality badge info with theme classes
  const getQualityBadge = () => {
    // Try multiple properties that might contain resolution information
    const resolution = (
      displayData.video_full_resolution ||
      displayData.stream_video_full_resolution ||
      ""
    ).toLowerCase();

    if (resolution.includes("4k") || resolution.includes("2160")) {
      return {
        label: "2160p",
        icon: Icons.CircleDot,
        className: "bg-accent-lighter text-accent border-accent",
      };
    }
    if (resolution.includes("1080")) {
      return {
        label: "1080p",
        icon: Icons.Circle,
        className: "bg-green-500/20 text-green-400 border-green-500/30",
      };
    }
    if (resolution.includes("720")) {
      return {
        label: "720p",
        icon: Icons.Circle,
        className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      };
    }
    return {
      label: "480p",
      icon: Icons.CircleDashed,
      className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };
  };

  const getMediaTypeIcon = () => {
    switch (displayData.media_type?.toLowerCase()) {
      case "movie":
        return Icons.Film;
      case "episode":
        return Icons.Tv;
      case "show":
        return Icons.Tv2;
      case "season":
        return Icons.List;
      default:
        return Icons.Film;
    }
  };

  const getMediaSpecificInfo = () => {
    switch (displayData.media_type?.toLowerCase()) {
      case "movie":
        return (
          <>
            {displayData.studio && (
              <div className="space-y-1.5">
                <h3 className="text-theme-muted text-sm">Studio</h3>
                <p className="text-theme">{displayData.studio}</p>
              </div>
            )}

            {displayData.writers && displayData.writers.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-theme-muted text-sm">Writers</h3>
                <p className="text-theme">{displayData.writers.join(", ")}</p>
              </div>
            )}
            {displayData.genres && (
              <div className="space-y-1.5">
                <h3 className="text-theme-muted text-sm">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {displayData.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-2 py-1 rounded-lg border border-accent bg-accent-lighter text-accent text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      case "episode":
        return (
          <>
            <div className="space-y-1.5">
              <h3 className="text-theme-muted text-sm">Show</h3>
              <p className="text-theme">{displayData.grandparent_title}</p>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-theme-muted text-sm">Season</h3>
              <p className="text-theme">{displayData.parent_media_index}</p>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-theme-muted text-sm">Episode</h3>
              <p className="text-theme">{displayData.media_index}</p>
            </div>
            {displayData.writers && displayData.writers.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-theme-muted text-sm">Writers</h3>
                <p className="text-theme">{displayData.writers.join(", ")}</p>
              </div>
            )}
          </>
        );
      case "show":
        return (
          <>
            {displayData.studio && (
              <div className="space-y-1.5">
                <h3 className="text-theme-muted text-sm">Studio</h3>
                <p className="text-theme">{displayData.studio}</p>
              </div>
            )}
            {displayData.genres && displayData.genres.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-theme-muted text-sm">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {displayData.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-2 py-1 rounded-lg border text-sm"
                      style={{
                        backgroundColor: `rgba(${accentRgb}, 0.1)`,
                        color: `rgb(${accentRgb})`,
                        borderColor: `rgba(${accentRgb}, 0.3)`,
                      }}
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      default:
        return null;
    }
  };

  // Get cast/actors section
  const getCastSection = () => {
    if (!displayData.actors || !displayData.actors.length) {
      return null;
    }

    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-medium text-white">Cast</h3>
          {displayData.actors.length > 6 && (
            <span
              onClick={() => setShowCast(!showCast)}
              className="text-sm flex items-center gap-1 cursor-pointer text-accent hover:text-accent-hover transition-theme"
            >
              {showCast ? (
                <>
                  <Icons.ChevronUp size={14} />
                  Show Less
                </>
              ) : (
                <>
                  <Icons.ChevronDown size={14} />
                  Show All
                </>
              )}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {displayData.actors
            .slice(0, showCast ? undefined : 6)
            .map((actor, index) => (
              <div
                key={`${actor.name || actor}-${index}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-accent bg-accent-lighter"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-accent-light">
                  <Icons.User className="text-accent" size={16} />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">
                    {actor.name || actor}
                  </p>
                  {actor.role && (
                    <p className="text-gray-400 text-xs">{actor.role}</p>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  const quality = getQualityBadge();
  const MediaTypeIcon = getMediaTypeIcon();

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Black Backdrop with a hint of accent color */}
      <div className="fixed inset-0 backdrop-blur-sm bg-black/80 bg-accent-lighter/5" />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-4xl bg-theme-modal rounded-xl overflow-hidden shadow-accent 
      border border-accent animate-in fade-in duration-200
      max-h-[90vh] flex flex-col"
      >
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-modal/90 backdrop-blur-sm z-50">
            <div className="animate-spin mr-2">
              <Icons.Loader2 className="h-8 w-8 text-accent" />
            </div>
            <span className="text-white">Loading media details...</span>
          </div>
        )}

        {/* Hero Section */}
        <div className="relative">
          {/* Background Image */}
          <div className="aspect-video relative overflow-hidden">
            {getBackgroundUrl() ? (
              <div
                className="absolute inset-0 bg-cover bg-center scale-105"
                style={{
                  backgroundImage: `url(${getBackgroundUrl()})`,
                }}
              >
                {/* Black gradient overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80"></div>
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-accent opacity-30"></div>
            )}

            {/* Content */}
            <div className="relative h-full flex flex-col justify-end p-6">
              {/* Media Type Badge */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-sm rounded-lg border border-accent bg-accent-lighter">
                  <MediaTypeIcon size={14} className="text-accent" />
                  <span className="text-sm">
                    {displayData.media_type.charAt(0).toUpperCase() +
                      displayData.media_type.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-sm">
                {displayData.title}
              </h2>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {displayData.year && (
                  <div className="flex items-center gap-1.5 px-2 py-1 backdrop-blur-sm rounded-lg border border-accent bg-accent-lighter">
                    <Icons.Calendar size={14} className="text-accent" />
                    <span className="text-white">{displayData.year}</span>
                  </div>
                )}

                {displayData.duration && (
                  <div className="flex items-center gap-1.5 px-2 py-1 backdrop-blur-sm rounded-lg border border-accent bg-accent-lighter">
                    <Icons.Clock size={14} className="text-accent" />
                    <span className="text-white">
                      {formatDuration(displayData.duration)}
                    </span>
                  </div>
                )}

                {displayData.rating && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 backdrop-blur-sm rounded-lg border border-yellow-500/20">
                    <Icons.Star size={14} className="text-yellow-400" />
                    <span className="text-yellow-400">
                      {displayData.rating}
                    </span>
                  </div>
                )}

                {displayData.content_rating && (
                  <div className="px-2 py-1 backdrop-blur-sm rounded-lg border border-accent bg-accent-lighter text-white">
                    {displayData.content_rating}
                  </div>
                )}

                {(displayData.video_full_resolution ||
                  displayData.stream_video_full_resolution) && (
                  <div
                    className={`flex items-center gap-1.5 px-2 py-1 backdrop-blur-sm rounded-lg border ${
                      quality.className || "border-accent bg-accent-lighter"
                    }`}
                  >
                    <quality.icon
                      size={14}
                      className={quality.className ? "" : "text-accent"}
                    />
                    <span className={quality.className ? "" : "text-accent"}>
                      {quality.label}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Accent color strip under hero section */}
        <div className="h-1 w-full bg-gradient-accent"></div>

        {/* Scrollable Content Section */}
        <div className="overflow-y-auto flex-1">
          <div className="p-6 space-y-6">
            {/* Summary */}
            {displayData.summary && (
              <div className="relative">
                <p
                  className={`text-theme text-lg leading-relaxed ${
                    !isExpanded ? "line-clamp-4" : ""
                  }`}
                >
                  {displayData.summary}
                </p>
                {displayData.summary.split(" ").length > 60 && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-sm mt-2 flex items-center gap-1 bg-transparent border-none px-2 py-1 rounded text-accent hover:bg-accent-lighter transition-theme"
                  >
                    {isExpanded ? (
                      <>
                        <Icons.ChevronUp size={14} />
                        Show Less
                      </>
                    ) : (
                      <>
                        <Icons.ChevronDown size={14} />
                        Read More
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Cast section */}
            {getCastSection()}

            {/* Details Grid with accent bg */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-5 rounded-lg border border-accent bg-accent-lighter">
              {/* Media Specific Info */}
              {getMediaSpecificInfo()}

              {/* Common Info */}
              <div className="space-y-1.5">
                <h3 className="text-theme-muted text-sm">Added</h3>
                <div className="flex items-center gap-1.5">
                  <Icons.Calendar size={14} className="text-accent" />
                  <p className="text-theme">
                    {formatDate(displayData.added_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Close Button with accent hover */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white border border-transparent 
    hover:bg-accent-light hover:text-accent hover:border-accent transition-theme"
          aria-label="Close"
        >
          <Icons.X size={20} />
        </button>
      </div>
    </div>
  );

  // Render modal through portal
  return createPortal(
    modalContent,
    document.getElementById("modal-root") || document.body
  );
};

export default MediaModal;
