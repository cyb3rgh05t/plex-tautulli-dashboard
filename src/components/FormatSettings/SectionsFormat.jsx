import React, { useState, useEffect, useRef } from "react";
import { logError } from "../../utils/logger";
import toast from "react-hot-toast";
import ThemedButton from "../common/ThemedButton";
import ThemedCard from "../common/ThemedCard";
import * as Icons from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

// Helper functions
const formatDate = (timestamp, format = "default") => {
  // Return early if no timestamp
  if (!timestamp) return "Never";

  let date;

  try {
    // Handle ISO date strings (YYYY-MM-DD)
    if (typeof timestamp === "string" && timestamp.includes("-")) {
      date = new Date(timestamp);
    }
    // Handle numeric timestamps
    else if (typeof timestamp === "number" || !isNaN(Number(timestamp))) {
      const ts = typeof timestamp === "number" ? timestamp : Number(timestamp);
      // If timestamp is smaller than year 2100 in seconds (4,294,967,296), assume it's in seconds
      date = ts < 4294967296 ? new Date(ts * 1000) : new Date(ts);
    }
    // Fallback
    else {
      date = new Date(timestamp);
    }
  } catch (e) {
    console.error(`Error parsing date: ${timestamp}`, e);
    return "Invalid Date";
  }

  // Ensure we have a valid date
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date from timestamp: ${timestamp}`);
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
      if (diffSeconds < 0) return date.toLocaleDateString();

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

// Enhanced formatDuration function for more robust duration handling
const formatDuration = (durationMs) => {
  // Ensure we have a valid input
  if (!durationMs) return "0m";

  let duration;

  // Handle string inputs that might already be formatted (e.g., "45m")
  if (typeof durationMs === "string") {
    // If it's already in the format we want (e.g., "45m" or "1h 30m"), return it
    if (/^\d+h( \d+m)?$|^\d+m$/.test(durationMs.trim())) {
      return durationMs.trim();
    }

    // If it's a number in string format, parse it
    duration = Number(durationMs);
  } else {
    duration = Number(durationMs);
  }

  // If duration is invalid or 0, return "0m"
  if (isNaN(duration) || duration <= 0) return "0m";

  // If duration is in seconds (common for Plex/Tautulli), convert to milliseconds
  // Heuristic: if duration is less than 10000 and greater than 0, it's likely in seconds
  if (duration > 0 && duration < 10000) {
    duration *= 1000;
  }

  // Convert milliseconds to minutes
  const totalMinutes = Math.floor(duration / 60000);

  // Calculate hours and remaining minutes
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Format the output
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
};

const formatArray = (arr) => {
  if (!arr || !Array.isArray(arr)) return "";
  return arr.join(", ");
};

// Template processing helper
const processTemplate = (template, data) => {
  if (!template || !data) return "";

  let result = template;
  const variables = template.match(/\{([^}]+)\}/g) || [];

  variables.forEach((variable) => {
    const match = variable.slice(1, -1).split(":");
    const key = match[0];
    const format = match[1] || "default";

    let value;

    try {
      // Special handling for timestamp fields
      if (
        [
          "added_at",
          "updated_at",
          "last_viewed_at",
          "originally_available_at",
        ].includes(key)
      ) {
        value = formatDate(data[key], format);
      }
      // Special handling for duration
      else if (key === "duration") {
        value = formatDuration(data[key]);
      }
      // Special handling for arrays
      else if (
        [
          "directors",
          "writers",
          "actors",
          "genres",
          "labels",
          "collections",
        ].includes(key)
      ) {
        value = formatArray(data[key]);
      }
      // Special handling for counts
      else if (["count", "parent_count", "child_count"].includes(key)) {
        value = (data[key] || 0).toLocaleString();
      }
      // Default handling for all other fields
      else {
        value = data[key] !== undefined ? data[key] : "";
      }
    } catch (error) {
      console.error(`Error processing template variable ${key}:`, error);
      value = "";
    }

    // Replace the variable with the formatted value
    result = result.replace(variable, value);
  });

  return result;
};

// Available variables for sections
const SECTION_VARIABLES = [
  // Basic Information
  { name: "section_id", description: "Unique identifier for the section" },
  { name: "section_name", description: "Name of the library section" },
  { name: "section_type", description: "Type of media (movie, show, artist)" },
  { name: "library_name", description: "Library display name" },

  // Metadata Fields
  { name: "title", description: "Media title" },
  { name: "original_title", description: "Original title if different" },
  { name: "full_title", description: "Complete title with additional info" },
  { name: "sort_title", description: "Title used for sorting" },
  { name: "tagline", description: "Media tagline or short description" },
  { name: "summary", description: "Full plot summary or description" },

  // Media Information
  { name: "media_type", description: "Type of media content" },
  { name: "content_rating", description: "Content rating (e.g., PG-13, R)" },
  { name: "rating", description: "Critics rating score" },
  { name: "audience_rating", description: "Audience rating score" },
  { name: "user_rating", description: "User-provided rating" },
  { name: "duration", description: "Content duration" },
  { name: "year", description: "Release year" },
  { name: "studio", description: "Production studio" },

  // Related Content IDs
  { name: "rating_key", description: "Unique rating identifier" },
  { name: "parent_rating_key", description: "Parent content rating key" },
  {
    name: "grandparent_rating_key",
    description: "Grandparent content rating key",
  },
  { name: "parent_title", description: "Title of parent content" },
  { name: "grandparent_title", description: "Title of grandparent content" },
  { name: "media_index", description: "Position in series/season" },
  { name: "parent_media_index", description: "Parent position index" },

  // Timestamps
  {
    name: "added_at",
    description:
      "When item was added (formats: default, short, relative, full, time)",
    isDate: true,
  },
  {
    name: "updated_at",
    description:
      "Last update time (formats: default, short, relative, full, time)",
    isDate: true,
  },
  {
    name: "last_viewed_at",
    description:
      "Last viewed time (formats: default, short, relative, full, time)",
    isDate: true,
  },
  {
    name: "originally_available_at",
    description:
      "Original release date (formats: default, short, relative, full, time)",
    isDate: true,
  },

  // Image Paths
  { name: "thumb", description: "Thumbnail image path" },
  { name: "parent_thumb", description: "Parent thumbnail path" },
  { name: "grandparent_thumb", description: "Grandparent thumbnail path" },
  { name: "art", description: "Artwork image path" },
  { name: "banner", description: "Banner image path" },

  // Arrays
  { name: "directors", description: "List of directors" },
  { name: "writers", description: "List of writers" },
  { name: "actors", description: "List of actors" },
  { name: "genres", description: "List of genres" },
  { name: "labels", description: "Applied labels" },
  { name: "collections", description: "Collection memberships" },
];

// Component subcomponents
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

    // Find matching section from the sections array
    const matchingSection = sections.find(
      (s) =>
        s.section_id && s.section_id.toString() === format.sectionId.toString()
    );

    // Return the name if found, otherwise fallback to section ID
    return matchingSection
      ? matchingSection.name ||
          matchingSection.section_name ||
          `Section ${format.sectionId}`
      : `Section ${format.sectionId}`;
  };

  return (
    <ThemedCard
      id={`format-${format.name.replace(/\s+/g, "-")}`}
      className="hover:bg-gray-800/70 transition-all duration-200"
      isInteractive
      hasBorder
      useAccentBorder={true}
    >
      <div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4 className="text-white font-medium">{format.name}</h4>
            <p className="text-sm text-theme-muted">
              Applied to: {getSectionName()}
            </p>
          </div>
          <div className="flex gap-2">
            <ThemedButton
              variant="ghost"
              size="sm"
              icon={Icons.Edit2}
              onClick={() => onEdit(format)}
              className="text-accent-base hover:text-accent-hover hover:bg-accent-light/20"
              title="Edit format"
            />
            <ThemedButton
              variant="ghost"
              size="sm"
              icon={Icons.Trash2}
              onClick={() => onDelete(format.name)}
              className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
              title="Delete format"
            />
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
            <div className="flex items-center gap-2 text-theme-muted text-sm mb-2">
              <Icons.Code size={14} className="text-accent-base" />
              <span>Template</span>
            </div>
            <code className="text-sm text-gray-300 font-mono">
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
      </div>
    </ThemedCard>
  );
};

// Main component
const SectionsFormat = () => {
  const [formats, setFormats] = useState([]);
  const [sections, setSections] = useState([]);
  const [newFormat, setNewFormat] = useState({
    name: "",
    template: "",
    sectionId: "all",
  });
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState({
    section_id: "1",
    section_name: "Movies",
    section_type: "movie",
    media_type: "movie",
    title: "The Matrix",
    original_title: "The Matrix",
    full_title: "The Matrix (1999)",
    tagline: "Welcome to the Real World",
    summary:
      "A computer programmer discovers that reality as he knows it is a simulation created by machines, and joins a rebellion to break free.",
    rating: "8.7",
    content_rating: "R",
    duration: "8160000", // 2 hours 16 minutes in milliseconds
    year: "1999",
    studio: "Warner Bros.",
    count: 1250,
    parent_count: 1250,
    child_count: 0,
    added_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    updated_at: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
    last_viewed_at: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
    originally_available_at: "1999-03-31",
    directors: ["Lana Wachowski", "Lilly Wachowski"],
    writers: ["Lana Wachowski", "Lilly Wachowski"],
    actors: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],
    genres: ["Action", "Sci-Fi"],
    labels: ["Favorite"],
    collections: ["The Matrix Collection"],
  });
  const [error, setError] = useState(null);
  const templateInputRef = useRef(null);
  const formRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingFormat, setEditingFormat] = useState(null);
  const scrollPositionRef = useRef(0);

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
      const response = await fetch(`/api/sections`);
      const data = await response.json();

      // Process sections to ensure they have the expected structure
      const processedSections = (data.sections || []).map((section) => {
        // Extract from raw_data if present, otherwise use direct properties
        const rawData = section.raw_data || {};
        return {
          section_id: rawData.section_id || section.section_id,
          name:
            rawData.name ||
            section.name ||
            rawData.section_name ||
            section.section_name ||
            "Unknown Section",
          type:
            rawData.type ||
            section.type ||
            rawData.section_type ||
            section.section_type ||
            "unknown",
        };
      });

      setSections(processedSections);
      console.log("Processed sections:", processedSections);
    } catch (error) {
      console.error("Failed to fetch sections:", error);
    }
  };

  // Fetch formats from the API
  const fetchFormats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/formats`);
      const data = await response.json();
      setFormats(data.sections || []);
    } catch (err) {
      logError("Failed to fetch section formats", err);
      setError("Failed to load formats");
      toast.error("Failed to load formats");
    } finally {
      setLoading(false);
    }
  };

  // Load formats and sections when component mounts
  useEffect(() => {
    fetchFormats();
    fetchSections();
  }, []);

  // Insert variable into template
  const insertVariable = (variableName) => {
    if (templateInputRef.current) {
      const input = templateInputRef.current;
      const start = input.selectionStart;
      const end = input.selectionEnd;

      const insertValue = [
        "added_at",
        "updated_at",
        "last_viewed_at",
        "originally_available_at",
      ].includes(variableName)
        ? `{${variableName}:relative}`
        : `{${variableName}}`;

      const currentValue = newFormat.template;
      const newValue =
        currentValue.substring(0, start) +
        insertValue +
        currentValue.substring(end);

      setNewFormat({ ...newFormat, template: newValue });

      setTimeout(() => {
        const newCursorPos = start + insertValue.length;
        input.focus();
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  // Handle edit button click
  const handleEdit = (format) => {
    // Save current scroll position
    saveScrollPosition();

    // Set form values from the format
    setNewFormat({
      name: format.name,
      template: format.template,
      sectionId: format.sectionId || "all",
    });
    setIsEditing(true);
    setEditingFormat(format);

    // Scroll to the form and focus the template input
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

  // Handle canceling edit mode
  const handleCancelEdit = () => {
    // Save current scroll position
    saveScrollPosition();

    setIsEditing(false);
    setEditingFormat(null);
    setNewFormat({ name: "", template: "", sectionId: "all" });

    // Restore scroll position
    restoreScrollPosition();
  };

  // Handle form submission for new format or update existing format
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newFormat.name || !newFormat.template) return;

    // Save current scroll position
    saveScrollPosition();

    try {
      // Get current formats
      const response = await fetch(`/api/formats`);
      const data = await response.json();
      const currentFormats = data.sections || [];

      let updatedFormats;
      let successMessage;

      if (isEditing) {
        // Update existing format
        updatedFormats = currentFormats.map((format) => {
          if (
            format.name === editingFormat.name &&
            format.sectionId === editingFormat.sectionId
          ) {
            return newFormat;
          }
          return format;
        });
        successMessage = "Format updated successfully";
      } else {
        // Check for duplicate names for the same section
        if (
          currentFormats.some(
            (f) =>
              f.name === newFormat.name && f.sectionId === newFormat.sectionId
          )
        ) {
          toast.error(
            "A format with this name already exists for this section"
          );
          return;
        }

        // Add new format and save
        updatedFormats = [...currentFormats, newFormat];
        successMessage = "Format created successfully";
      }

      const saveResponse = await fetch(`/api/formats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "sections",
          formats: updatedFormats,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error(
          isEditing ? "Failed to update format" : "Failed to save format"
        );
      }

      // Update local state
      setFormats(updatedFormats);

      // Reset form
      setNewFormat({ name: "", template: "", sectionId: "all" });
      setIsEditing(false);
      setEditingFormat(null);

      toast.success(successMessage);

      // Restore scroll position
      restoreScrollPosition();
    } catch (err) {
      logError(
        isEditing
          ? "Failed to update section format"
          : "Failed to save section format",
        err
      );
      toast.error(
        isEditing ? "Failed to update format" : "Failed to save format"
      );
    }
  };

  // Modified handleDelete function for SectionsFormat.jsx
  const handleDelete = async (formatName, sectionId = "all") => {
    // Save current scroll position
    saveScrollPosition();

    try {
      const response = await fetch(`/api/formats`);
      const data = await response.json();
      const currentFormats = data.sections || [];

      // Remove format - use both name and sectionId to ensure we only delete formats from this component
      const updatedFormats = currentFormats.filter(
        (f) => !(f.name === formatName && f.sectionId === sectionId)
      );

      // Save updated formats
      const saveResponse = await fetch(`/api/formats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "sections",
          formats: updatedFormats,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to delete format");
      }

      // Update local state
      setFormats(updatedFormats);

      // If we're editing the deleted format, exit edit mode
      if (
        isEditing &&
        editingFormat &&
        editingFormat.name === formatName &&
        editingFormat.sectionId === sectionId
      ) {
        setIsEditing(false);
        setEditingFormat(null);
        setNewFormat({ name: "", template: "", sectionId: "all" });
      }

      toast.success("Format deleted successfully");

      // Restore scroll position
      restoreScrollPosition();
    } catch (err) {
      logError("Failed to delete section format", err);
      toast.error("Failed to delete format");
    }
  };

  // Update preview data when section changes
  useEffect(() => {
    if (newFormat.sectionId !== "all") {
      const selectedSection = sections.find(
        (s) => s.section_id.toString() === newFormat.sectionId
      );
      if (selectedSection) {
        setPreviewData({
          ...previewData,
          section_id: selectedSection.section_id,
          section_name: selectedSection.name,
          section_type: selectedSection.type,
        });
      }
    } else {
      // Reset to default preview data
      setPreviewData({
        ...previewData,
        section_id: "1",
        section_name: "Movies",
        section_type: "movie",
      });
    }
  }, [newFormat.sectionId, sections]);

  // Render loading state
  if (loading) {
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
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Icons.AlertCircle className="text-red-400" size={18} />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Available Variables Section */}
      <ThemedCard
        title="Available Variables"
        icon={Icons.Code}
        className="p-6"
        useAccentBorder={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SECTION_VARIABLES.map((variable) => (
            <VariableButton
              key={variable.name}
              variable={variable}
              onClick={insertVariable}
            />
          ))}
        </div>
      </ThemedCard>

      {/* Create/Edit New Format Section */}
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
                <span className="font-medium">"{editingFormat.name}"</span>
              </p>
            </div>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-theme font-medium mb-2">
              Format Name
            </label>
            <input
              type="text"
              value={newFormat.name}
              onChange={(e) =>
                setNewFormat({ ...newFormat, name: e.target.value })
              }
              className="w-full bg-gray-900/50 text-white border border-gray-700/50 rounded-lg px-4 py-3
                focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                transition-all duration-200"
              placeholder="e.g., Section Status"
            />
          </div>

          <div>
            <label className="block text-theme font-medium mb-2">Section</label>
            <select
              value={newFormat.sectionId}
              onChange={(e) =>
                setNewFormat({ ...newFormat, sectionId: e.target.value })
              }
              className="w-full bg-gray-900/50 text-white border border-gray-700/50 rounded-lg px-4 py-3
                focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                transition-all duration-200"
            >
              <option value="all">All Sections</option>
              {sections.map((section) => (
                <option
                  key={String(section.section_id || `section-${Math.random()}`)}
                  value={section.section_id}
                >
                  {section.name || "Unknown"} (ID: {section.section_id || "N/A"}
                  )
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
              placeholder="e.g., {title} ({year}) - Added {added_at:relative}"
            />
            <p className="text-theme-muted text-xs mt-2">
              Tip: For timestamps, you can use formats: default, short,
              relative, full, time (e.g., {"{added_at:relative}"})
            </p>
          </div>

          {/* Live Preview */}
          {newFormat.template && (
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
              <label className="block text-theme font-medium mb-2">
                Preview
              </label>
              <code className="text-accent-base font-mono block">
                {processTemplate(newFormat.template, previewData)}
              </code>
            </div>
          )}

          {/* Current Section Info Display */}
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
            <div className="flex items-center gap-2">
              <Icons.Database className="text-accent-base" size={16} />
              <span className="text-theme-muted">Section:</span>
              <span className="font-medium text-accent-base">
                {newFormat.sectionId === "all"
                  ? "All Sections"
                  : sections.find(
                      (s) => s.section_id?.toString() === newFormat.sectionId
                    )?.name || `Section ${newFormat.sectionId}`}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <ThemedButton
              type="submit"
              variant="accent"
              disabled={!newFormat.name || !newFormat.template}
              icon={isEditing ? Icons.Save : Icons.Plus}
            >
              {isEditing ? "Update Format" : "Add Format"}
            </ThemedButton>

            {isEditing && (
              <ThemedButton
                type="button"
                variant="ghost"
                onClick={handleCancelEdit}
                icon={Icons.X}
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
              Section Metadata Formats
            </h3>
            <div className="px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/50">
              <span className="text-sm font-medium text-theme-muted">
                {formats.length} Format{formats.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <ThemedCard hasBorder={false} className="p-0">
            <div className="grid grid-cols-1 gap-4 p-4">
              {formats.map((format, index) => (
                <FormatCard
                  key={`format-${format.name}-${index}`}
                  format={format}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  sections={sections}
                  previewValue={processTemplate(
                    format.template,
                    format.sectionId === "all"
                      ? previewData
                      : {
                          ...previewData,
                          section_id: format.sectionId,
                          section_name:
                            sections.find(
                              (s) =>
                                s.section_id?.toString() === format.sectionId
                            )?.name || "Unknown Section",
                          section_type:
                            sections.find(
                              (s) =>
                                s.section_id?.toString() === format.sectionId
                            )?.type || "unknown",
                        }
                  )}
                />
              ))}
            </div>
          </ThemedCard>
        </div>
      )}
    </div>
  );
};

export default SectionsFormat;
