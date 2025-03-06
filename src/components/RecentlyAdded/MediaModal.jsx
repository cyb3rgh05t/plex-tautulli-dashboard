import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import * as Icons from "lucide-react";
import ThemedButton from "../common/ThemedButton";
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

const MediaModal = ({ media, onClose, apiKey }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMore, setShowMore] = useState(false);
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
        console.error("Error fetching media details:", error);
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
        className: "bg-accent-light text-accent-base border-accent",
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
            {displayData.director && (
              <div className="space-y-1.5">
                <h3 className="text-theme-muted text-sm">Director</h3>
                <p className="text-theme">{displayData.director}</p>
              </div>
            )}
            {displayData.genres && (
              <div className="space-y-1.5">
                <h3 className="text-theme-muted text-sm">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {displayData.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-2 py-1 bg-gray-800/50 rounded-lg border border-gray-700/50 text-theme text-sm"
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
          </>
        );
      case "show":
        return (
          <>
            {displayData.network && (
              <div className="space-y-1.5">
                <h3 className="text-theme-muted text-sm">Network</h3>
                <p className="text-theme">{displayData.network}</p>
              </div>
            )}
            {displayData.season_count && (
              <div className="space-y-1.5">
                <h3 className="text-theme-muted text-sm">Seasons</h3>
                <p className="text-theme">{displayData.season_count}</p>
              </div>
            )}
            {displayData.episode_count && (
              <div className="space-y-1.5">
                <h3 className="text-theme-muted text-sm">Episodes</h3>
                <p className="text-theme">{displayData.episode_count}</p>
              </div>
            )}
          </>
        );
      default:
        return null;
    }
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
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        style={{ borderColor: "rgb(var(--accent-color))" }}
        className="relative w-full max-w-4xl bg-modal rounded-xl overflow-hidden shadow-2xl 
          shadow-accent/10 border border-solid animate-in fade-in duration-200
          max-h-[90vh] flex flex-col"
      >
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-modal backdrop-blur-sm z-50">
            <div className="animate-spin mr-2">
              <Icons.Loader2 className="h-8 w-8 text-accent-base" />
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
                {/* Removed gradient overlay */}
                <div className="absolute inset-0 bg-black/50" />{" "}
                {/* Simple dark overlay instead */}
              </div>
            ) : (
              <div className="absolute inset-0 gradient-accent" />
            )}

            {/* Content */}
            <div className="relative h-full flex flex-col justify-end p-6">
              {/* Media Type Badge */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-700/50">
                  <MediaTypeIcon size={14} className="text-accent-base" />
                  <span className="text-sm text-theme">
                    {displayData.media_type.charAt(0).toUpperCase() +
                      displayData.media_type.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-4xl font-bold text-white mb-4">
                {displayData.title}
              </h2>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {displayData.year && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-700/50">
                    <Icons.Calendar size={14} className="text-theme-muted" />
                    <span className="text-theme">{displayData.year}</span>
                  </div>
                )}

                {displayData.duration && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-700/50">
                    <Icons.Clock size={14} className="text-theme-muted" />
                    <span className="text-theme">
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
                  <div className="px-2 py-1 bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-700/50 text-theme">
                    {displayData.content_rating}
                  </div>
                )}

                {(displayData.video_full_resolution ||
                  displayData.stream_video_full_resolution) && (
                  <div
                    className={`flex items-center gap-1.5 px-2 py-1 backdrop-blur-sm rounded-lg border ${quality.className}`}
                  >
                    <quality.icon size={14} />
                    <span>{quality.label}</span>
                  </div>
                )}

                {displayData.file_size && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-700/50">
                    <Icons.HardDrive size={14} className="text-theme-muted" />
                    <span className="text-theme">
                      {formatFileSize(displayData.file_size)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Accent color strip under hero section */}
        <div className="h-1 w-full bg-accent-base"></div>

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
                    className="text-accent-base hover:text-accent-hover text-sm mt-2 flex items-center gap-1 bg-transparent border-none"
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

            {/* Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {/* Media Specific Info */}
              {getMediaSpecificInfo()}

              {/* Common Info */}
              <div className="space-y-1.5">
                <h3 className="text-theme-muted text-sm">Added</h3>
                <div className="flex items-center gap-1.5">
                  <Icons.Calendar size={14} className="text-theme-muted" />
                  <p className="text-theme">
                    {formatDate(displayData.added_at)}
                  </p>
                </div>
              </div>

              {displayData.last_viewed_at && (
                <div className="space-y-1.5">
                  <h3 className="text-theme-muted text-sm">Last Viewed</h3>
                  <div className="flex items-center gap-1.5">
                    <Icons.Eye size={14} className="text-theme-muted" />
                    <p className="text-theme">
                      {formatDate(displayData.last_viewed_at)}
                    </p>
                  </div>
                </div>
              )}

              {(displayData.video_full_resolution ||
                displayData.stream_video_full_resolution) && (
                <div className="space-y-1.5">
                  <h3 className="text-theme-muted text-sm">Quality</h3>
                  <div className="flex items-center gap-1.5">
                    <quality.icon size={14} className="text-theme-muted" />
                    <p className="text-theme">
                      {displayData.video_full_resolution ||
                        displayData.stream_video_full_resolution}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Close Button - now white */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
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
