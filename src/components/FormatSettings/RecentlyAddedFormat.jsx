import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "react-query";
import axios from "axios";
import toast from "react-hot-toast";
import { useConfig } from "../../context/ConfigContext";
import { logError, logInfo, logDebug, logWarn } from "../../utils/logger";
import {
  Trash2,
  Code,
  Plus,
  Variable,
  AlertCircle,
  Edit,
  Save,
  X,
} from "lucide-react";
import { formatDuration } from "./duration-formatter";
import ThemedButton from "../common/ThemedButton";
import ThemedCard from "../common/ThemedCard";
import * as Icons from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

// Update EXAMPLE_DATA with more consistent timestamps
const EXAMPLE_DATA = {
  movies: {
    rating_key: "12345",
    title: "Inception",
    year: "2010",
    mediaType: "movie",
    addedAt: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 3, // 3 days ago in seconds (Unix timestamp)
    added_at: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 3, // Include both formats
    summary:
      "A thief who steals corporate secrets through the use of dream-sharing technology",
    rating: "8.8",
    contentRating: "PG-13",
    duration: "148 min",
    video_full_resolution: "1080p",
  },
  shows: {
    rating_key: "67890",
    grandparent_title: "Breaking Bad",
    parent_media_index: "5",
    media_index: "2",
    title: "Madrigal",
    year: "2012",
    mediaType: "show",
    addedAt: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 3, // 3 days ago in seconds (Unix timestamp)
    added_at: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 3, // Include both formats
    summary: "Walt meets with Gus Fring's former employer",
    rating: "9.5",
    contentRating: "TV-MA",
    duration: "47 min",
    video_full_resolution: "1080p",
  },
  music: {
    rating_key: "54321",
    title: "Bohemian Rhapsody",
    grandparent_title: "Queen",
    parent_title: "A Night at the Opera",
    year: "1975",
    mediaType: "music",
    addedAt: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 3, // 3 days ago in seconds (Unix timestamp)
    added_at: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 3, // Include both formats
    summary: "Iconic rock ballad by Queen",
    duration: "5:55",
  },
};

// Available variables for each media type
const AVAILABLE_VARIABLES = {
  movies: [
    { name: "rating_key", description: "Unique identifier for the media" },
    { name: "video_full_resolution", description: "Video quality" },
    { name: "title", description: "Movie title" },
    { name: "year", description: "Year of release" },
    { name: "mediaType", description: "Type of media" },
    {
      name: "addedAt",
      description:
        "Timestamp when media was added (formats: default, short, relative, full, time)",
    },
    { name: "summary", description: "Brief summary of the media" },
    { name: "rating", description: "Media rating" },
    { name: "content_rating", description: "Content rating (PG, R, etc.)" },
    { name: "duration", description: "Runtime" },
  ],
  shows: [
    { name: "rating_key", description: "Unique identifier for the media" },
    { name: "video_full_resolution", description: "Video quality" },
    { name: "grandparent_title", description: "Show name" },
    { name: "parent_media_index", description: "Season number" },
    { name: "media_index", description: "Episode number" },
    { name: "title", description: "Episode title" },
    { name: "year", description: "Year of release" },
    { name: "mediaType", description: "Type of media" },
    {
      name: "addedAt",
      description:
        "Timestamp when media was added (formats: default, short, relative, full, time)",
    },
    { name: "summary", description: "Brief summary of the media" },
    { name: "rating", description: "Media rating" },
    { name: "content_rating", description: "Content rating (PG, R, etc.)" },
    { name: "duration", description: "Runtime" },
  ],
  music: [
    { name: "rating_key", description: "Unique identifier for the media" },
    { name: "title", description: "Album title" },
    //{ name: "grandparent_title", description: "Artist name" },
    { name: "parent_title", description: "Artist name" },
    { name: "year", description: "Year of release" },
    { name: "mediaType", description: "Type of media" },
    {
      name: "addedAt",
      description:
        "Timestamp when media was added (formats: default, short, relative, full, time)",
    },
    { name: "summary", description: "Additional information" },
    //{ name: "duration", description: "Track duration" },
  ],
};

const VariableButton = ({ variable, onClick }) => (
  <button
    onClick={() => onClick(variable.name)}
    className="bg-gray-800/50 p-4 rounded-lg text-left hover:bg-gray-800/70 
      border  border-accent transition-all duration-200 group"
  >
    <div className="flex items-start justify-between">
      <div>
        <code className="text-accent-base font-mono">
          {variable.isDate
            ? `{${variable.name}:relative}`
            : `{${variable.name}}`}
        </code>
        <p className="text-theme-muted text-sm mt-2">{variable.description}</p>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Icons.Plus className="text-accent-base" size={16} />
      </div>
    </div>
  </button>
);

const FormatCard = ({ format, onDelete, onEdit, previewValue, sections }) => {
  // Get section name if sectionId is not "all"
  const getSectionName = () => {
    if (format.sectionId === "all" || !format.sectionId) {
      return "All Sections";
    }

    // Find section with matching ID
    const matchingSection =
      sections &&
      sections.find(
        (section) =>
          section.section_id &&
          section.section_id.toString() === format.sectionId.toString()
      );

    // Return section name or ID if no matching section found
    return matchingSection
      ? matchingSection.name ||
          matchingSection.section_name ||
          `Section ${format.sectionId}`
      : `Section ${format.sectionId}`;
  };

  return (
    <ThemedCard
      id={`format-card-${format.name}`}
      className="p-4"
      isInteractive
      hasBorder
      useAccentBorder={true}
    >
      <div className="flex justify-between items-center mb-3">
        <div>
          <h4 className="text-white font-medium">{format.name}</h4>
          <p className="text-sm text-theme-muted">
            Applied to: {getSectionName()}
          </p>
        </div>
        <div className="flex gap-2">
          <ThemedButton
            onClick={() => onEdit(format)}
            variant="ghost"
            size="sm"
            icon={Edit}
            className="text-accent-base hover:text-accent-hover hover:bg-accent-light/20"
          />
          <ThemedButton
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => onDelete(format)}
            className="text-red-400 hover:bg-red-500/10"
          />
        </div>
      </div>
      <div className="space-y-3">
        <div className="bg-gray-900/50 rounded-lg p-3 border  border-accent">
          <div className="flex items-center gap-2 text-theme-muted text-sm mb-2">
            <Icons.Code size={14} className="text-accent-base" />
            <span>Template</span>
          </div>
          <code className="text-sm text-theme font-mono">
            {format.template}
          </code>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 border  border-accent">
          <div className="flex items-center gap-2 text-theme-muted text-sm mb-2">
            <Icons.Variable size={14} className="text-accent-base" />
            <span>Preview</span>
          </div>
          <code className="text-sm text-accent-base font-mono">
            {previewValue}
          </code>
        </div>
      </div>
    </ThemedCard>
  );
};

// Updated helper function for date formatting
const formatDate = (timestamp, format = "default") => {
  // Return early if no timestamp
  if (!timestamp) return "Never";

  let date;

  try {
    // Handle different timestamp formats

    // Case 1: If timestamp is a number but looks like seconds (10-digit number), convert to milliseconds
    if (typeof timestamp === "number" || !isNaN(Number(timestamp))) {
      const ts = Number(timestamp);
      // Unix timestamp in seconds (e.g., 1612345678) vs milliseconds (e.g., 1612345678000)
      // If the number is less than year 2100 in seconds, assume it's in seconds
      date = ts < 4294967296 ? new Date(ts * 1000) : new Date(ts);
    }
    // Case 2: ISO string (e.g., "2021-02-03T12:34:56Z")
    else if (typeof timestamp === "string" && timestamp.includes("-")) {
      date = new Date(timestamp);
    }
    // Case 3: Already a Date object
    else if (timestamp instanceof Date) {
      date = timestamp;
    }
    // Case 4: Fallback - try direct conversion
    else {
      date = new Date(timestamp);
    }
  } catch (e) {
    logError(`Error parsing date from timestamp: ${timestamp}`, e);
    return "Invalid Date";
  }

  // Ensure we have a valid date
  if (isNaN(date.getTime())) {
    console.warn(`Failed to parse timestamp: ${timestamp}`);
    return "Invalid Date";
  }

  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  switch (format) {
    case "short":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

    case "relative":
      if (diffSeconds < 0) {
        return "Future date";
      }

      if (diffYears > 0) {
        return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
      }

      if (diffMonths > 0) {
        return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
      }

      if (diffDays > 0) {
        return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
      }

      if (diffHours > 0) {
        return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
      }

      if (diffMinutes > 0) {
        return diffMinutes === 1
          ? "1 minute ago"
          : `${diffMinutes} minutes ago`;
      }

      return diffSeconds === 1 ? "1 second ago" : `${diffSeconds} seconds ago`;

    case "full":
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    case "time":
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

    default:
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
  }
};

// Helper function for processing templates
const processTemplate = (template, data) => {
  if (!template) return "";

  let result = template;
  const variables = template.match(/\{([^}]+)\}/g) || [];

  // Create normalized data object with both camelCase and snake_case versions
  const normalizedData = { ...data };

  // Add camelCase versions of snake_case keys
  Object.keys(data).forEach((key) => {
    if (key.includes("_")) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      if (!normalizedData[camelKey]) {
        normalizedData[camelKey] = data[key];
      }
    }
  });

  // Add snake_case versions of camelCase keys
  Object.keys(data).forEach((key) => {
    if (/[A-Z]/.test(key)) {
      const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (!normalizedData[snakeKey]) {
        normalizedData[snakeKey] = data[key];
      }
    }
  });

  variables.forEach((variable) => {
    const match = variable.slice(1, -1).split(":");
    const key = match[0];
    const format = match[1] || "default";

    let value;

    // Special handling for timestamp - using key aliases for flexibility
    if (key === "addedAt" || key === "added_at") {
      // Get timestamp from either key
      const timestamp = normalizedData.addedAt || normalizedData.added_at;
      value = formatDate(timestamp, format);
    }
    // Special handling for duration
    else if (key === "duration") {
      // Prioritize formatted_duration if available
      value =
        normalizedData.formatted_duration ||
        formatDuration(Number(normalizedData[key]) || 0);
    }
    // Special handling for season and episode numbers - always show as 2 digits
    else if (key === "parent_media_index" || key === "media_index") {
      // Ensure all season and episode numbers are padded to 2 digits
      const rawValue = normalizedData[key] || "0";
      const numberValue =
        typeof rawValue === "number" ? rawValue : parseInt(rawValue, 10);
      value = String(numberValue).padStart(2, "0");

      // Add S or E prefix for show episode context
      if (
        normalizedData.mediaType === "show" ||
        normalizedData.media_type === "show"
      ) {
        if (key === "parent_media_index") {
          value = `S${value}`;
        } else if (key === "media_index") {
          value = `E${value}`;
        }
      }
    }
    // Handle all other variables
    else {
      value = normalizedData[key];
    }

    if (value !== undefined) {
      result = result.replace(variable, value);
    }
  });

  return result;
};

const RecentlyAddedFormat = () => {
  const { config } = useConfig();
  const [activeMediaType, setActiveMediaType] = useState("movies");
  const [sections, setSections] = useState([]);
  const [formats, setFormats] = useState([]);
  const [recentMedia, setRecentMedia] = useState([]);
  const [mediaMetadata, setMediaMetadata] = useState({});
  const [newFormat, setNewFormat] = useState({
    name: "",
    template: "",
    type: "movies",
    sectionId: "all",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState(null);
  const templateInputRef = useRef(null);
  const formRef = useRef(null);
  const scrollPositionRef = useRef(0);

  // New state for edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editingFormatId, setEditingFormatId] = useState(null);

  // Save scroll position helper
  const saveScrollPosition = () => {
    scrollPositionRef.current = window.scrollY;
  };

  // Restore scroll position helper
  const restoreScrollPosition = () => {
    setTimeout(() => {
      window.scrollTo({
        top: scrollPositionRef.current,
        behavior: "auto", // Use auto instead of smooth to prevent visible scrolling
      });
    }, 100);
  };

  // Fetch sections
  const fetchSections = async () => {
    try {
      const response = await axios.get(`/api/sections`);
      const fetchedSections = response.data.sections || [];

      // Map sections to ensure they have the required properties
      const processedSections = fetchedSections.map((section) => {
        const sectionData = section.raw_data || section;
        return {
          ...sectionData,
          section_id: sectionData.section_id,
          // Make sure we have a valid type property
          type: sectionData.type || sectionData.section_type || "unknown",
          // Make sure we have a name property
          name:
            sectionData.name || sectionData.section_name || "Unknown Section",
        };
      });

      setSections(processedSections);
      return processedSections;
    } catch (error) {
      logError("Failed to fetch sections:", error);
      return [];
    }
  };

  // Fetch recent media with section filtering
  const fetchRecentMedia = async (sections) => {
    setIsLoading(true);
    try {
      const configResponse = await fetch(`/api/config`);
      const config = await configResponse.json();

      const typeMap = {
        movies: "movie",
        shows: "show",
        music: "artist",
      };

      // Add null/undefined check for sections
      if (!sections || !Array.isArray(sections)) {
        console.warn("No valid sections array provided to fetchRecentMedia");
        setIsLoading(false);
        return [];
      }

      // Filter and handle potential type errors
      const filteredSections = sections.filter((section) => {
        // Check if section exists and has a type property
        if (!section || typeof section !== "object") return false;

        // Get the type safely, with fallbacks
        const sectionType = section.type || section.section_type || "";

        // Safely compare, handle case-sensitivity
        return (
          typeof sectionType === "string" &&
          sectionType.toLowerCase() === typeMap[activeMediaType]
        );
      });

      const mediaPromises = filteredSections.map(async (section) => {
        try {
          const response = await axios.get(`/api/tautulli/api/v2`, {
            params: {
              apikey: config.tautulliApiKey,
              cmd: "get_recently_added",
              section_id: section.section_id,
              count: 10,
            },
          });

          const mediaItems =
            response.data?.response?.data?.recently_added || [];
          return mediaItems.map((item) => ({
            ...item,
            section_id: section.section_id,
          }));
        } catch (error) {
          logError(
            `Failed to fetch media for section ${section.section_id}:`,
            error
          );
          return [];
        }
      });

      const allMedia = await Promise.all(mediaPromises);
      const flattenedMedia = allMedia.flat();
      setRecentMedia(flattenedMedia);
      return flattenedMedia;
    } catch (error) {
      logError("Failed to fetch recent media:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch metadata for media items
  const fetchMediaMetadata = async (media) => {
    setIsLoading(true);
    try {
      // Safety check for media
      if (!media || !Array.isArray(media) || media.length === 0) {
        console.warn("No valid media array provided to fetchMediaMetadata");
        setIsLoading(false);
        return;
      }

      const metadataPromises = media.map(async (item) => {
        try {
          const response = await axios.get(`/api/tautulli/api/v2`, {
            params: {
              apikey: config.tautulliApiKey,
              cmd: "get_metadata",
              rating_key: item.rating_key,
            },
          });

          return {
            rating_key: item.rating_key,
            video_full_resolution:
              response.data?.response?.data?.media_info?.[0]
                ?.video_full_resolution || "Unknown",
          };
        } catch (error) {
          logError(`Failed to fetch metadata for ${item.rating_key}:`, error);
          return {
            rating_key: item.rating_key,
            video_full_resolution: "Unknown",
          };
        }
      });

      const metadataResults = await Promise.all(metadataPromises);
      const metadataMap = Object.fromEntries(
        metadataResults.map((item) => [
          item.rating_key,
          item.video_full_resolution,
        ])
      );

      setMediaMetadata(metadataMap);
    } catch (error) {
      logError("Failed to fetch media metadata:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPreviewData = (sectionId) => {
    let previewData = { ...EXAMPLE_DATA[activeMediaType] };

    // Safely check if recentMedia exists and has items
    if (recentMedia && recentMedia.length > 0) {
      const mediaItem =
        sectionId === "all"
          ? recentMedia[0]
          : recentMedia.find((item) => item && item.section_id === sectionId) ||
            recentMedia[0];

      if (mediaItem) {
        // Copy all available properties
        Object.keys(previewData).forEach((key) => {
          if (mediaItem.hasOwnProperty(key)) {
            previewData[key] = mediaItem[key];
          }
        });

        // Ensure critical properties are set
        if (activeMediaType === "shows") {
          previewData.grandparent_title =
            mediaItem.grandparent_title || previewData.grandparent_title;
          previewData.parent_media_index =
            mediaItem.parent_media_index || previewData.parent_media_index;
          previewData.media_index =
            mediaItem.media_index || previewData.media_index;
        }

        // Ensure both timestamp formats are available
        previewData.addedAt =
          mediaItem.added_at || mediaItem.addedAt || previewData.addedAt;
        previewData.added_at =
          mediaItem.added_at || mediaItem.addedAt || previewData.added_at;

        // Ensure both content rating formats are available
        previewData.contentRating =
          mediaItem.content_rating ||
          mediaItem.contentRating ||
          previewData.contentRating;
        previewData.content_rating =
          mediaItem.content_rating ||
          mediaItem.contentRating ||
          previewData.content_rating;

        // Set resolution
        previewData.video_full_resolution =
          mediaMetadata[mediaItem.rating_key] ||
          mediaItem.video_full_resolution ||
          "Unknown";
      }
    }

    // Ensure timestamp is in the right format for previews
    if (
      previewData.addedAt &&
      typeof previewData.addedAt === "string" &&
      !isNaN(Number(previewData.addedAt))
    ) {
      // Convert string timestamp to number if needed
      previewData.addedAt = Number(previewData.addedAt);
      previewData.added_at = Number(previewData.addedAt);
    }

    return previewData;
  };

  // Template preview using memoization
  const templatePreview = useMemo(() => {
    const previewData = getPreviewData(newFormat.sectionId);
    return processTemplate(newFormat.template || "", {
      ...previewData,
      mediaType: activeMediaType,
    });
  }, [
    newFormat.template,
    newFormat.sectionId,
    recentMedia,
    mediaMetadata,
    activeMediaType,
  ]);

  // Insert variable into template
  const insertVariable = (variableName) => {
    if (templateInputRef.current) {
      const input = templateInputRef.current;
      const start = input.selectionStart;
      const end = input.selectionEnd;

      const insertValue =
        variableName === "addedAt"
          ? `{${variableName}:relative}`
          : `{${variableName}}`;

      const currentValue = newFormat.template;
      const newValue =
        currentValue.substring(0, start) +
        insertValue +
        currentValue.substring(end);

      setNewFormat({ ...newFormat, template: newValue });

      // Restore cursor position after update
      setTimeout(() => {
        const newCursorPos = start + insertValue.length;
        input.focus();
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  // Handle edit button click
  const handleEditFormat = (format) => {
    // Save current scroll position
    saveScrollPosition();

    logInfo("Editing format:", format);

    // Normalize the format data to prevent type mismatches
    const normalizedFormat = {
      name: format.name,
      template: format.template,
      sectionId: format.sectionId ? String(format.sectionId) : "all",
      type: format.type,
    };

    // Set form values from the format
    setNewFormat(normalizedFormat);
    setIsEditing(true);
    setEditingFormatId({
      name: normalizedFormat.name,
      type: normalizedFormat.type,
      sectionId: normalizedFormat.sectionId,
    });

    // Temporarily disable media type switching while editing
    const mediaTypeTabs = document.querySelectorAll(".media-type-tab");
    mediaTypeTabs.forEach((tab) => {
      if (tab.getAttribute("data-type") !== activeMediaType) {
        tab.setAttribute("disabled", "true");
      }
    });

    // Scroll to form and focus the template input
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      if (templateInputRef.current) {
        templateInputRef.current.focus();
      }
    }, 100);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    // Save current scroll position
    saveScrollPosition();

    // Re-enable media type switching
    const mediaTypeTabs = document.querySelectorAll(".media-type-tab");
    mediaTypeTabs.forEach((tab) => {
      tab.removeAttribute("disabled");
    });

    setNewFormat({
      name: "",
      template: "",
      type: activeMediaType,
      sectionId: "all",
    });
    setIsEditing(false);
    setEditingFormatId(null);
    setValidationErrors(null);

    // Restore scroll position
    restoreScrollPosition();
  };

  // Validate a format to check for duplicates
  const validateFormat = (formatToCheck, currentFormats) => {
    logInfo("Validating format:", formatToCheck);
    logInfo("Against formats:", currentFormats);

    // Normalize values for comparison
    const normalizedFormatToCheck = {
      name: String(formatToCheck.name),
      type: String(formatToCheck.type),
      sectionId: formatToCheck.sectionId
        ? String(formatToCheck.sectionId)
        : "all",
    };

    // If editing, ignore the format with the same ID
    const formatsToCheck = isEditing
      ? currentFormats.filter((f) => {
          // Normalize values for comparison
          const normalizedFormat = {
            name: String(f.name),
            type: String(f.type),
            sectionId: f.sectionId ? String(f.sectionId) : "all",
          };

          const normalizedEditingId = {
            name: String(editingFormatId.name),
            type: String(editingFormatId.type),
            sectionId: editingFormatId.sectionId
              ? String(editingFormatId.sectionId)
              : "all",
          };

          // Only return true (filter in) if it's NOT the format we're currently editing
          const isCurrentlyEditing =
            normalizedFormat.name === normalizedEditingId.name &&
            normalizedFormat.type === normalizedEditingId.type &&
            normalizedFormat.sectionId === normalizedEditingId.sectionId;

          if (isCurrentlyEditing) {
            logInfo("Excluding current format from validation:", f);
          }

          return !isCurrentlyEditing;
        })
      : currentFormats;

    // Allow duplicate names for different sections - only check within same sectionId
    const duplicateFormat = formatsToCheck.find((f) => {
      // Normalize values for comparison
      const normalizedF = {
        name: String(f.name),
        type: String(f.type),
        sectionId: f.sectionId ? String(f.sectionId) : "all",
      };

      const isDuplicate =
        normalizedF.name === normalizedFormatToCheck.name &&
        normalizedF.type === normalizedFormatToCheck.type &&
        normalizedF.sectionId === normalizedFormatToCheck.sectionId;

      if (isDuplicate) {
        logInfo("Found duplicate:", f);
      }

      return isDuplicate;
    });

    if (duplicateFormat) {
      return {
        valid: false,
        error: `A format named "${formatToCheck.name}" already exists for this section. You can use the same name for different sections.`,
      };
    }

    return { valid: true };
  };

  const handleAddOrUpdateFormat = async () => {
    if (newFormat.name && newFormat.template && newFormat.type) {
      // Save current scroll position
      saveScrollPosition();

      const formatItem = {
        name: newFormat.name,
        template: newFormat.template,
        type: activeMediaType,
        sectionId: newFormat.sectionId || "all",
      };

      try {
        setValidationErrors(null);

        // Get current formats
        const response = await fetch(`/api/formats`);
        const data = await response.json();
        const currentFormats = data.recentlyAdded || [];

        // Validate the format
        const validation = validateFormat(formatItem, currentFormats);
        if (!validation.valid) {
          setValidationErrors(validation.error);
          return;
        }

        // Create a new array of formats - either update existing or add new
        let updatedFormats;
        let successMessage;

        if (isEditing) {
          // Update existing format
          updatedFormats = currentFormats.map((format) => {
            if (
              format.name === editingFormatId.name &&
              format.type === editingFormatId.type &&
              format.sectionId === editingFormatId.sectionId
            ) {
              return formatItem;
            }
            return format;
          });
          successMessage = `Format updated successfully`;
        } else {
          // Add new format
          updatedFormats = [...currentFormats, formatItem];
          successMessage = `New format created successfully`;
        }

        // Save formats
        const saveResponse = await fetch(`/api/formats`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "recentlyAdded",
            formats: updatedFormats,
          }),
        });

        if (!saveResponse.ok) {
          throw new Error("Failed to save format");
        }

        // Clear media cache so that new formats are immediately applied
        try {
          logInfo("Automatically clearing media cache after format change...");
          await fetch(`/api/clear-cache/media`, {
            method: "POST",
          });
          logInfo("Media cache cleared successfully");
        } catch (cacheError) {
          logError("Failed to clear media cache:", cacheError);
          // Continue with success flow even if cache clear fails
        }

        // Update local state with formats of the current media type
        setFormats(updatedFormats.filter((f) => f.type === activeMediaType));

        toast.success(successMessage);

        // Reset form and editing state
        setNewFormat({
          name: "",
          template: "",
          type: activeMediaType,
          sectionId: "all",
        });
        setIsEditing(false);
        setEditingFormatId(null);

        // Restore scroll position
        restoreScrollPosition();
      } catch (error) {
        logError("Failed to save format:", error);
        toast.error("Failed to save format");
      }
    }
  };

  const handleDeleteFormat = async (formatToDelete) => {
    // Save current scroll position
    saveScrollPosition();

    try {
      // Get current formats
      const response = await fetch(`/api/formats`);
      const data = await response.json();
      const currentFormats = data.recentlyAdded || [];

      // Remove the specific format by matching name, type AND sectionId
      const updatedFormats = currentFormats.filter(
        (format) =>
          !(
            format.name === formatToDelete.name &&
            format.type === formatToDelete.type &&
            format.sectionId === formatToDelete.sectionId
          )
      );

      // Save updated formats
      const saveResponse = await fetch(`/api/formats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "recentlyAdded",
          formats: updatedFormats,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save formats");
      }

      // Clear media cache so that format changes are immediately applied
      try {
        logInfo("Automatically clearing media cache after format deletion...");
        await fetch(`/api/clear-cache/media`, {
          method: "POST",
        });
        logInfo("Media cache cleared successfully");
      } catch (cacheError) {
        logError("Failed to clear media cache:", cacheError);
        // Continue with success flow even if cache clear fails
      }

      // Update local state
      setFormats(updatedFormats.filter((f) => f.type === activeMediaType));

      // If currently editing this format, reset the form
      if (
        isEditing &&
        editingFormatId.name === formatToDelete.name &&
        editingFormatId.type === formatToDelete.type &&
        editingFormatId.sectionId === formatToDelete.sectionId
      ) {
        handleCancelEdit();
      }

      toast.success(`Format deleted successfully`);

      // Restore scroll position
      restoreScrollPosition();
    } catch (error) {
      logError("Failed to delete format:", error);
      toast.error("Failed to delete format");
    }
  };

  // Update the effect that loads formats
  useEffect(() => {
    const fetchFormats = async () => {
      try {
        const response = await fetch(`/api/formats`);
        const data = await response.json();

        // Filter formats to only show current media type
        const formatsForCurrentType = (data.recentlyAdded || []).filter(
          (format) => format.type === activeMediaType
        );

        setFormats(formatsForCurrentType);
      } catch (error) {
        logError("Failed to load formats:", error);
        toast.error("Failed to load formats");
      }
    };

    fetchFormats();
  }, [activeMediaType]);

  // Load media data when media type changes
  useEffect(() => {
    const loadMediaData = async () => {
      try {
        const savedSections = await fetchSections();
        const recentMedia = await fetchRecentMedia(savedSections);
        if (recentMedia && recentMedia.length > 0) {
          await fetchMediaMetadata(recentMedia);
        }
      } catch (error) {
        logError("Failed to load media data:", error);
      }
    };

    loadMediaData();
  }, [activeMediaType]);

  // Filter sections safely
  const filteredSections = sections.filter((section) => {
    // Make sure section exists and has properties we need
    if (!section || typeof section !== "object") return false;

    const typeMap = {
      movies: "movie",
      shows: "show",
      music: "artist",
    };

    // Get the section type safely with fallback
    const sectionType = section.type || section.section_type || "";

    // Return only if we have a valid string type that matches our expected type
    return (
      typeof sectionType === "string" &&
      sectionType.toLowerCase() === typeMap[activeMediaType]
    );
  });

  // Media Type Tabs
  const MediaTypeTab = ({ type, label }) => (
    <button
      onClick={() => {
        if (isEditing) {
          // Prevent changing media type while editing
          toast.warning("Please finish editing the current format first");
          return;
        }
        setActiveMediaType(type);
        setNewFormat((prev) => ({ ...prev, type }));
        setValidationErrors(null);
      }}
      disabled={isEditing}
      className={`media-type-tab px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        activeMediaType === type
          ? "bg-accent-light text-accent-base"
          : isEditing
          ? "text-gray-500 cursor-not-allowed" // Disabled state
          : "text-gray-400 hover:text-white hover:bg-gray-700/50"
      }`}
      data-type={type}
    >
      {label}
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-accent animate-spin mr-2">
          <Icons.Loader2 className="h-8 w-8 text-accent-base" />
        </div>
        <span className="text-theme">Loading Formats...</span>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      {/* Error message */}
      {validationErrors && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Icons.AlertCircle className="text-red-400" size={18} />
            <p className="text-red-400">{validationErrors}</p>
          </div>
        </div>
      )}
      {/* Media Type Tabs */}
      <div className="flex gap-2 mb-4">
        <MediaTypeTab type="movies" label="Movies" />
        <MediaTypeTab type="shows" label="TV Shows" />
        <MediaTypeTab type="music" label="Music" />
      </div>

      {/* Available Variables Section */}
      <ThemedCard
        title="Available Variables"
        icon={Icons.Variable}
        className="p-6"
        useAccentBorder={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AVAILABLE_VARIABLES[activeMediaType].map((variable) => (
            <VariableButton
              key={variable.name}
              variable={{
                ...variable,
                name:
                  variable.name === "addedAt"
                    ? "addedAt:relative"
                    : variable.name,
              }}
              onClick={insertVariable}
            />
          ))}
        </div>
      </ThemedCard>

      {/* Create/Edit Format Section */}
      <ThemedCard
        title={isEditing ? "Edit Format" : "Create New Format"}
        icon={isEditing ? Icons.Edit2 : Icons.PlusCircle}
        className="p-6"
        useAccentBorder={true}
      >
        {isEditing && (
          <div className="bg-accent-light/20 border border-accent-base/30 rounded-lg mb-4 px-4 py-3">
            <div className="flex items-center gap-2">
              <Icons.Info size={18} className="text-accent-base" />
              <p className="text-sm text-white">
                You are editing format{" "}
                <span className="font-medium">"{editingFormatId?.name}"</span>
              </p>
            </div>
          </div>
        )}
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            handleAddOrUpdateFormat();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-theme font-medium mb-2">
              Format Name
            </label>
            <input
              type="text"
              value={newFormat.name}
              onChange={(e) => {
                setNewFormat({ ...newFormat, name: e.target.value });
                setValidationErrors(null);
              }}
              className="w-full bg-gray-900/50 text-white border  border-accent rounded-lg px-4 py-3
                focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                transition-all duration-200"
              placeholder={`e.g., Custom Recently Added Format`}
            />
            <p className="text-green-400 text-xs mt-2">
              You can reuse the same format name for different sections
            </p>
          </div>

          <div>
            <label className="block text-theme font-medium mb-2">Section</label>
            <select
              value={newFormat.sectionId}
              onChange={(e) => {
                setNewFormat({ ...newFormat, sectionId: e.target.value });
                setValidationErrors(null);
              }}
              className="w-full bg-gray-900/50 text-white border  border-accent rounded-lg px-4 py-3
                focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                transition-all duration-200"
            >
              <option value="all">All Sections</option>
              {filteredSections.map((section) => (
                <option key={section.section_id} value={section.section_id}>
                  {section.name || section.section_name || "Unknown"} (ID:{" "}
                  {section.section_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-theme font-medium mb-2">
              Template
              <span className="text-theme-muted text-sm ml-2">
                (click variables above to add them)
              </span>
            </label>
            <input
              ref={templateInputRef}
              type="text"
              value={newFormat.template}
              onChange={(e) =>
                setNewFormat({ ...newFormat, template: e.target.value })
              }
              className="w-full bg-gray-900/50 text-white border  border-accent rounded-lg px-4 py-3
                focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                transition-all duration-200 font-mono"
              placeholder={
                activeMediaType === "shows"
                  ? "e.g., {grandparent_title} S{parent_media_index}E{media_index} - {title}"
                  : activeMediaType === "movies"
                  ? "e.g., {title} ({video_full_resolution})"
                  : "e.g., {grandparent_title} - {title}"
              }
            />
            <p className="text-theme-muted text-xs mt-2">
              Tip: Use {`{addedAt:format}`} with formats: default, short,
              relative, full, time
            </p>
          </div>

          {/* Validation Error */}
          {validationErrors && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle size={16} />
                <p className="text-sm">{validationErrors}</p>
              </div>
            </div>
          )}

          {/* Live Preview */}
          {newFormat.template && (
            <div className="bg-gray-900/50 rounded-lg p-4 border  border-accent">
              <label className="block text-theme font-medium mb-2">
                Preview
              </label>
              <code className="text-accent-base font-mono block">
                {templatePreview || "Invalid template"}
              </code>
            </div>
          )}

          {/* Current Media Type Display */}
          <div className="bg-gray-900/50 rounded-lg p-3 border  border-accent">
            <div className="flex items-center gap-2">
              <Icons.Film className="text-accent-base" size={16} />
              <span className="text-theme-muted">Media Type:</span>
              <span className="font-medium text-accent-base">
                {activeMediaType.charAt(0).toUpperCase() +
                  activeMediaType.slice(1)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <ThemedButton
              type="submit"
              variant="accent"
              disabled={!newFormat.name || !newFormat.template}
              icon={isEditing ? Save : Plus}
            >
              {isEditing ? "Save Changes" : "Add Format"}
            </ThemedButton>

            {isEditing && (
              <ThemedButton
                type="button"
                onClick={handleCancelEdit}
                variant="ghost"
                icon={X}
              >
                Cancel
              </ThemedButton>
            )}
          </div>
        </form>
      </ThemedCard>

      {/* Existing Formats Section */}
      {formats.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Icons.List className="text-accent-base" size={18} />
              {activeMediaType.charAt(0).toUpperCase() +
                activeMediaType.slice(1)}{" "}
              Formats
            </h3>
            <div className="px-3 py-1.5 bg-gray-900/50 rounded-lg border  border-accent">
              <span className="text-sm font-medium text-theme-muted">
                {formats.length} Format{formats.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {formats.map((format, index) => {
              const previewData = getPreviewData(format.sectionId || "all");
              const previewValue = processTemplate(format.template, {
                ...previewData,
                mediaType: activeMediaType,
              });

              return (
                <FormatCard
                  key={`${format.name}-${format.sectionId}-${index}`}
                  format={format}
                  onDelete={handleDeleteFormat}
                  onEdit={handleEditFormat}
                  previewValue={previewValue}
                  sections={sections}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentlyAddedFormat;
