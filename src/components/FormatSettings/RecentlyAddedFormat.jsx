// with theme styling applied

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "react-query";
import axios from "axios";
import toast from "react-hot-toast";
import { useConfig } from "../../context/ConfigContext";
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
    addedAt: Math.floor(Date.now() / 1000) - 25 * 60, // 25 minutes ago
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
    addedAt: Math.floor(Date.now() / 1000) - 25 * 60, // 25 minutes ago
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
    addedAt: Math.floor(Date.now() / 1000) - 25 * 60, // 25 minutes ago
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
    { name: "contentRating", description: "Content rating (PG, R, etc.)" },
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
    { name: "contentRating", description: "Content rating (PG, R, etc.)" },
    { name: "duration", description: "Runtime" },
  ],
  music: [
    { name: "rating_key", description: "Unique identifier for the media" },
    { name: "title", description: "Track title" },
    { name: "grandparent_title", description: "Artist name" },
    { name: "parent_title", description: "Album name" },
    { name: "year", description: "Year of release" },
    { name: "mediaType", description: "Type of media" },
    {
      name: "addedAt",
      description:
        "Timestamp when media was added (formats: default, short, relative, full, time)",
    },
    { name: "summary", description: "Additional information" },
    { name: "duration", description: "Track duration" },
  ],
};

const VariableButton = ({ variable, onClick }) => (
  <button
    onClick={() => onClick(variable.name)}
    className="bg-gray-800/50 p-4 rounded-lg text-left hover:bg-gray-800/70 
      border border-gray-700/50 transition-all duration-200 group"
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
    <ThemedCard className="p-4" isInteractive hasBorder useAccentBorder={true}>
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
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
          <div className="flex items-center gap-2 text-theme-muted text-sm mb-2">
            <Icons.Code size={14} className="text-accent-base" />
            <span>Template</span>
          </div>
          <code className="text-sm text-theme font-mono">
            {format.template}
          </code>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
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
// Robust date formatting function
const formatDate = (timestamp, format = "default") => {
  // Ensure we have a valid timestamp
  const timestampNum =
    typeof timestamp === "string"
      ? timestamp.includes("-")
        ? Date.parse(timestamp)
        : Number(timestamp) * 1000
      : timestamp;

  const date = new Date(timestampNum);
  const now = new Date();

  // Ensure we have a valid date
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }

  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  switch (format) {
    case "short":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

    case "relative":
      if (diffSeconds < 0)
        return date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

      if (diffSeconds < 60) {
        return diffSeconds === 1
          ? "1 second ago"
          : `${diffSeconds} seconds ago`;
      }

      if (diffMinutes < 60) {
        return diffMinutes === 1
          ? "1 minute ago"
          : `${diffMinutes} minutes ago`;
      }

      if (diffHours < 24) {
        return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
      }

      if (diffDays < 30) {
        return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
      }

      // Fallback to date format if more than 30 days
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

    case "full":
      return date.toLocaleDateString("en-US", {
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
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
  }
};

// Helper function for processing templates
const processTemplate = (template, data) => {
  if (!template) return "";

  let result = template;
  const variables = template.match(/\{([^}]+)\}/g) || [];

  variables.forEach((variable) => {
    const match = variable.slice(1, -1).split(":");
    const key = match[0];
    const format = match[1] || "default";

    let value;

    // Special handling for timestamp - using key aliases for flexibility
    if (key === "addedAt" || key === "added_at") {
      // Get timestamp from either key
      const timestamp = data.addedAt || data.added_at;
      value = formatDate(timestamp, format);
    }
    // Special handling for duration
    else if (key === "duration") {
      // Prioritize formatted_duration if available
      value = data.formatted_duration || formatDuration(Number(data[key]) || 0);
    }
    // Special handling for season and episode numbers - always show as 2 digits
    else if (key === "parent_media_index" || key === "media_index") {
      // Ensure all season and episode numbers are padded to 2 digits
      const rawValue = data[key] || "0";
      const numberValue =
        typeof rawValue === "number" ? rawValue : parseInt(rawValue, 10);
      value = String(numberValue).padStart(2, "0");

      // Add S or E prefix for show episode context
      if (data.mediaType === "show" || data.media_type === "show") {
        if (key === "parent_media_index") {
          value = `S${value}`;
        } else if (key === "media_index") {
          value = `E${value}`;
        }
      }
    }
    // Handle all other variables
    else {
      value = data[key];
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

  // New state for edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editingFormatId, setEditingFormatId] = useState(null);

  // Fetch sections
  const fetchSections = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/sections`);
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
      console.error("Failed to fetch sections:", error);
      return [];
    }
  };

  // Fetch recent media with section filtering
  const fetchRecentMedia = async (sections) => {
    setIsLoading(true);
    try {
      const configResponse = await fetch(`${API_BASE_URL}/api/config`);
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
          const response = await axios.get(
            `${API_BASE_URL}/api/tautulli/api/v2`,
            {
              params: {
                apikey: config.tautulliApiKey,
                cmd: "get_recently_added",
                section_id: section.section_id,
                count: 10,
              },
            }
          );

          const mediaItems =
            response.data?.response?.data?.recently_added || [];
          return mediaItems.map((item) => ({
            ...item,
            section_id: section.section_id,
          }));
        } catch (error) {
          console.error(
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
      console.error("Failed to fetch recent media:", error);
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
          const response = await axios.get(
            `${API_BASE_URL}/api/tautulli/api/v2`,
            {
              params: {
                apikey: config.tautulliApiKey,
                cmd: "get_metadata",
                rating_key: item.rating_key,
              },
            }
          );

          return {
            rating_key: item.rating_key,
            video_full_resolution:
              response.data?.response?.data?.media_info?.[0]
                ?.video_full_resolution || "Unknown",
          };
        } catch (error) {
          console.error(
            `Failed to fetch metadata for ${item.rating_key}:`,
            error
          );
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
      console.error("Failed to fetch media metadata:", error);
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
        Object.keys(previewData).forEach((key) => {
          if (mediaItem.hasOwnProperty(key)) {
            previewData[key] = mediaItem[key];
          }
        });
        if (activeMediaType === "shows") {
          previewData.grandparent_title =
            mediaItem.grandparent_title || previewData.grandparent_title;
          previewData.parent_media_index =
            mediaItem.parent_media_index || previewData.parent_media_index;
          previewData.media_index =
            mediaItem.media_index || previewData.media_index;
        }
        previewData.addedAt = mediaItem.added_at || previewData.addedAt;
        previewData.video_full_resolution =
          mediaMetadata[mediaItem.rating_key] || "Unknown";
      }
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

  // Validate a format to check for duplicates
  const validateFormat = (formatToCheck, currentFormats) => {
    // If editing, ignore the format with the same ID
    const formatsToCheck = isEditing
      ? currentFormats.filter(
          (f) =>
            !(
              f.name === editingFormatId.name &&
              f.type === editingFormatId.type &&
              f.sectionId === editingFormatId.sectionId
            )
        )
      : currentFormats;

    // Allow duplicate names for different sections - only check within same sectionId
    const duplicateFormat = formatsToCheck.find(
      (f) =>
        f.name === formatToCheck.name &&
        f.type === formatToCheck.type &&
        f.sectionId === formatToCheck.sectionId
    );

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
      const formatItem = {
        name: newFormat.name,
        template: newFormat.template,
        type: activeMediaType,
        sectionId: newFormat.sectionId || "all",
      };

      try {
        setValidationErrors(null);

        // Get current formats
        const response = await fetch(`${API_BASE_URL}/api/formats`);
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
        const saveResponse = await fetch(`${API_BASE_URL}/api/formats`, {
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
      } catch (error) {
        console.error("Failed to save format:", error);
        toast.error("Failed to save format");
      }
    }
  };

  // Handler for editing a format
  const handleEditFormat = (format) => {
    setNewFormat({
      name: format.name,
      template: format.template,
      type: format.type,
      sectionId: format.sectionId || "all",
    });
    setIsEditing(true);
    setEditingFormatId({
      name: format.name,
      type: format.type,
      sectionId: format.sectionId,
    });

    // Scroll to form and focus the template input
    setTimeout(() => {
      if (templateInputRef.current) {
        templateInputRef.current.focus();
        templateInputRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setNewFormat({
      name: "",
      template: "",
      type: activeMediaType,
      sectionId: "all",
    });
    setIsEditing(false);
    setEditingFormatId(null);
    setValidationErrors(null);
  };

  const handleDeleteFormat = async (formatToDelete) => {
    try {
      // Get current formats
      const response = await fetch(`${API_BASE_URL}/api/formats`);
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
      const saveResponse = await fetch(`${API_BASE_URL}/api/formats`, {
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
    } catch (error) {
      console.error("Failed to delete format:", error);
      toast.error("Failed to delete format");
    }
  };

  // Update the effect that loads formats
  useEffect(() => {
    const fetchFormats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/formats`);
        const data = await response.json();

        // Filter formats to only show current media type
        const formatsForCurrentType = (data.recentlyAdded || []).filter(
          (format) => format.type === activeMediaType
        );

        setFormats(formatsForCurrentType);
      } catch (error) {
        console.error("Failed to load formats:", error);
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
        console.error("Failed to load media data:", error);
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
        setActiveMediaType(type);
        setNewFormat((prev) => ({ ...prev, type }));
        setValidationErrors(null);
        // Reset edit mode when changing media type
        if (isEditing) {
          handleCancelEdit();
        }
      }}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        activeMediaType === type
          ? "bg-accent-light text-accent-base"
          : "text-gray-400 hover:text-white hover:bg-gray-700/50"
      }`}
    >
      {label}
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin mr-2">
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
        <div className="space-y-4">
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
              className="w-full bg-gray-900/50 text-white border border-gray-700/50 rounded-lg px-4 py-3
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
              className="w-full bg-gray-900/50 text-white border border-gray-700/50 rounded-lg px-4 py-3
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
              className="w-full bg-gray-900/50 text-white border border-gray-700/50 rounded-lg px-4 py-3
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
            <ThemedCard
              className="bg-red-500/10 border-red-500/20 p-3"
              hasBorder={false}
            >
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle size={16} />
                <p className="text-sm">{validationErrors}</p>
              </div>
            </ThemedCard>
          )}

          {/* Live Preview */}
          {newFormat.template && (
            <ThemedCard className="p-4" hasBorder useAccentBorder={true}>
              <label className="block text-theme font-medium mb-2">
                Preview
              </label>
              <code className="text-accent-base font-mono block">
                {templatePreview || "Invalid template"}
              </code>
            </ThemedCard>
          )}

          <div className="flex gap-3">
            <ThemedButton
              onClick={handleAddOrUpdateFormat}
              disabled={!newFormat.name || !newFormat.template}
              variant="accent"
              icon={isEditing ? Save : Plus}
            >
              {isEditing ? "Save Changes" : "Add Format"}
            </ThemedButton>

            {isEditing && (
              <ThemedButton onClick={handleCancelEdit} variant="ghost" icon={X}>
                Cancel
              </ThemedButton>
            )}
          </div>
        </div>
      </ThemedCard>

      {/* Existing Formats Section */}
      {formats.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Existing Formats
            </h3>
            <div className="px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/50">
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
