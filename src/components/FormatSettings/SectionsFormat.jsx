// with theme styling applied

import React, { useState, useEffect, useRef } from "react";
import { logError } from "../../utils/logger";
import toast from "react-hot-toast";
import ThemedButton from "../common/ThemedButton";
import ThemedCard from "../common/ThemedCard";
import * as Icons from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

// Helper functions
const formatDuration = (duration) => {
  if (!duration) return "Unknown";

  // Convert to milliseconds if necessary
  const ms =
    duration.toString().length <= 6 ? duration * 1000 : Number(duration);

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
};

const formatDate = (timestamp, format = "default") => {
  if (!timestamp) return "Never";

  // Handle ISO date strings
  if (typeof timestamp === "string" && timestamp.includes("-")) {
    timestamp = new Date(timestamp).getTime() / 1000;
  }

  // Convert to milliseconds if needed
  const timestampMs =
    String(timestamp).length === 10 ? timestamp * 1000 : Number(timestamp);
  const date = new Date(timestampMs);
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
    if (
      [
        "added_at",
        "updated_at",
        "last_viewed_at",
        "originally_available_at",
      ].includes(key)
    ) {
      value = formatDate(data[key], format);
    } else if (key === "duration") {
      value = formatDuration(data[key]);
    } else if (
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
    } else if (
      key === "count" ||
      key === "parent_count" ||
      key === "child_count"
    ) {
      value = (data[key] || 0).toLocaleString();
    } else {
      value = data[key] || "";
    }

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

const FormatCard = ({ format, onDelete, previewValue }) => (
  <ThemedCard
    className="hover:bg-gray-800/70 transition-all duration-200"
    isInteractive
    hasBorder
    useAccentBorder={true}
    action={
      <ThemedButton
        variant="ghost"
        size="sm"
        icon={Icons.Trash2}
        onClick={() => onDelete(format.name)}
        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
      />
    }
  >
    <div>
      <div className="flex justify-between items-center mb-3">
        <div>
          <h4 className="text-white font-medium">{format.name}</h4>
          <p className="text-sm text-theme-muted">
            Applied to:{" "}
            {format.sectionId === "all"
              ? "All Sections"
              : `Section ${format.sectionId}`}
          </p>
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

  // Fetch sections
  const fetchSections = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sections`);
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
      const response = await fetch(`${API_BASE_URL}/api/formats`);
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

  // Handle form submission for new format
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newFormat.name || !newFormat.template) return;

    try {
      // Get current formats
      const response = await fetch(`${API_BASE_URL}/api/formats`);
      const data = await response.json();
      const currentFormats = data.sections || [];

      // Check for duplicate names for the same section
      if (
        currentFormats.some(
          (f) =>
            f.name === newFormat.name && f.sectionId === newFormat.sectionId
        )
      ) {
        toast.error("A format with this name already exists for this section");
        return;
      }

      // Add new format and save
      const updatedFormats = [...currentFormats, newFormat];
      const saveResponse = await fetch(`${API_BASE_URL}/api/formats`, {
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
        throw new Error("Failed to save format");
      }

      // Refresh formats and reset form
      fetchFormats();
      setNewFormat({ name: "", template: "", sectionId: "all" });
      toast.success("Format created successfully");
    } catch (err) {
      logError("Failed to save section format", err);
      toast.error("Failed to save format");
    }
  };

  // Handle format deletion
  const handleDelete = async (formatName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/formats`);
      const data = await response.json();
      const currentFormats = data.sections || [];

      // Remove format
      const updatedFormats = currentFormats.filter(
        (f) => f.name !== formatName
      );

      // Save updated formats
      const saveResponse = await fetch(`${API_BASE_URL}/api/formats`, {
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

      // Refresh formats
      fetchFormats();
      toast.success("Format deleted successfully");
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

      {/* Create New Format Section */}
      <ThemedCard
        title="Create New Format"
        icon={Icons.FilePlus}
        className="p-6"
        useAccentBorder={true}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <ThemedButton
            type="submit"
            variant="accent"
            disabled={!newFormat.name || !newFormat.template}
            icon={Icons.Plus}
          >
            Add Format
          </ThemedButton>
        </form>
      </ThemedCard>

      {/* Existing Formats Section */}
      {formats.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Icons.List className="text-accent-base" size={18} />
              Existing Formats
            </h3>
            <div className="px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/50">
              <span className="text-sm font-medium text-theme-muted">
                {formats.length} Format{formats.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {formats.map((format, index) => (
              <FormatCard
                key={index}
                format={format}
                onDelete={handleDelete}
                previewValue={processTemplate(
                  format.template,
                  format.sectionId === "all"
                    ? previewData
                    : {
                        ...previewData,
                        section_id: format.sectionId,
                        section_name:
                          sections.find(
                            (s) => s.section_id.toString() === format.sectionId
                          )?.name || "Unknown Section",
                        section_type:
                          sections.find(
                            (s) => s.section_id.toString() === format.sectionId
                          )?.type || "unknown",
                      }
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionsFormat;
