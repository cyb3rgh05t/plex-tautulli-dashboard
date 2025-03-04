import React, { useState, useEffect, useRef, useMemo } from "react";
import { useConfig } from "../../context/ConfigContext";
import { logError } from "../../utils/logger";
import * as Icons from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import ThemedButton from "../common/ThemedButton";
import ThemedCard from "../common/ThemedCard";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

// Variable Button Component
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

// Format Card Component
const FormatCard = ({ format, onDelete, onEdit, previewValue }) => (
  <ThemedCard
    id={`format-${format.name.replace(/\s+/g, "-")}`}
    isInteractive
    hasBorder
    useAccentBorder={true}
    className="p-4 hover:shadow-accent-sm transition-all duration-200"
  >
    <div className="flex justify-between items-center mb-3">
      <div>
        <h4 className="text-white font-medium">{format.name}</h4>
        <p className="text-sm text-theme-muted">
          Applied to:{" "}
          {format.sectionId === "all"
            ? "All Libraries"
            : `Section ${format.sectionId}`}
          {format.mediaType && (
            <span className="ml-2 text-accent-base">
              (
              {format.mediaType.charAt(0).toUpperCase() +
                format.mediaType.slice(1)}
              )
            </span>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <ThemedButton
          variant="ghost"
          size="sm"
          icon={Icons.Edit2}
          onClick={() => onEdit(format)}
          className="text-accent-base hover:bg-accent-light/20"
          title="Edit format"
        />
        <ThemedButton
          variant="ghost"
          size="sm"
          icon={Icons.Trash2}
          onClick={() => onDelete(format)}
          className="text-red-400 hover:bg-red-500/10"
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
        <code className="text-sm text-theme font-mono">{format.template}</code>
      </div>
      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
        <div className="flex items-center gap-2 text-theme-muted text-sm mb-2">
          <Icons.EyeIcon size={14} className="text-accent-base" />
          <span>Preview</span>
        </div>
        <code className="text-sm text-accent-base font-mono">
          {previewValue}
        </code>
      </div>
    </div>
  </ThemedCard>
);

// Date Formatting Utility
const formatDate = (timestamp, format = "default") => {
  if (!timestamp) return "Never";

  // Convert timestamp to milliseconds if needed
  const timestampMs =
    String(timestamp).length === 10 ? timestamp * 1000 : timestamp;
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
      value = data[key];
    } else if (key === "count" || key === "total_plays") {
      value = (data[key] || 0).toLocaleString();
    } else {
      value = data[key] || "";
    }

    result = result.replace(variable, value);
  });

  return result;
};

// Example data for previewing formats
const EXAMPLE_DATA = {
  movies: {
    section_id: "1",
    section_name: "Movies",
    section_type: "movie",
    count: 1250,
    parent_count: 1250,
    child_count: 0,
    total_plays: 10000,
    last_accessed: Math.floor(Date.now() / 1000) - 3600,
    last_played: Math.floor(Date.now() / 1000) - 86400,
  },
  shows: {
    section_id: "2",
    section_name: "TV Shows",
    section_type: "show",
    count: 250,
    parent_count: 50,
    child_count: 1200,
    total_plays: 5000,
    last_accessed: Math.floor(Date.now() / 1000) - 7200,
    last_played: Math.floor(Date.now() / 1000) - 172800,
  },
  music: {
    section_id: "3",
    section_name: "Music",
    section_type: "artist",
    count: 500,
    parent_count: 100,
    child_count: 5000,
    total_plays: 2500,
    last_accessed: Math.floor(Date.now() / 1000) - 14400,
    last_played: Math.floor(Date.now() / 1000) - 259200,
  },
};

// Available variables for sections
const SECTION_VARIABLES = [
  // Basic Information
  { name: "section_id", description: "Unique identifier for the section" },
  { name: "section_name", description: "Name of the library section" },
  { name: "section_type", description: "Type of media (movie, show, artist)" },

  // Count Information
  { name: "count", description: "Total number of primary items" },
  {
    name: "parent_count",
    description: "Number of parent items (e.g., shows, albums)",
  },
  {
    name: "child_count",
    description: "Total number of child items (e.g., episodes, tracks)",
  },

  // Activity Information
  {
    name: "total_plays",
    description: "Total number of plays for this library",
  },
  {
    name: "last_accessed",
    description:
      "Timestamp of last access (formats: default, short, relative, full, time)",
    isDate: true,
  },
  {
    name: "last_played",
    description:
      "Timestamp of last play (formats: default, short, relative, full, time)",
    isDate: true,
  },
];

const LibrariesFormat = () => {
  const { config } = useConfig();
  const [activeMediaType, setActiveMediaType] = useState("movies");
  const [formats, setFormats] = useState([]);
  const [sections, setSections] = useState([]);
  const [newFormat, setNewFormat] = useState({
    name: "",
    template: "",
    sectionId: "all",
    mediaType: "movies", // Default to movies
  });
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState(EXAMPLE_DATA);
  const [error, setError] = useState(null);
  const templateInputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingFormat, setEditingFormat] = useState(null);
  const scrollPositionRef = useRef(0);
  const formRef = useRef(null);

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
      const processedSections = (response.data.sections || []).map(
        (section) => {
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
        }
      );

      setSections(processedSections);
      console.log("Processed sections:", processedSections);
    } catch (error) {
      console.error("Failed to fetch sections:", error);
    }
  };

  // Fetch formats from the API
  const fetchFormats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/formats`);
      const data = await response.json();
      // Change to use libraries array instead of sections
      setFormats(data.libraries || []);
    } catch (err) {
      logError("Failed to fetch library formats", err);
      setError("Failed to load formats");
      toast.error("Failed to load formats");
    } finally {
      setIsLoading(false);
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

      const insertValue = ["last_accessed", "last_played"].includes(
        variableName
      )
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

  // Update media type when tab changes
  useEffect(() => {
    setNewFormat((prev) => ({
      ...prev,
      mediaType: activeMediaType, // Update media type in the form
    }));
  }, [activeMediaType]);

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
      // Change to use libraries array
      const currentFormats = data.libraries || [];

      let updatedFormats;
      let successMessage;

      if (isEditing) {
        // Update existing format
        updatedFormats = currentFormats.map((format) => {
          if (
            format.name === editingFormat.name &&
            format.sectionId === editingFormat.sectionId &&
            format.mediaType === editingFormat.mediaType
          ) {
            return {
              ...format,
              name: newFormat.name,
              template: newFormat.template,
              sectionId: newFormat.sectionId,
              mediaType: newFormat.mediaType, // Preserve media type
            };
          }
          return format;
        });
        successMessage = "Format updated successfully";
      } else {
        // Check for duplicate names for the same section and media type
        if (
          currentFormats.some(
            (f) =>
              f.name === newFormat.name &&
              f.sectionId === newFormat.sectionId &&
              f.mediaType === newFormat.mediaType
          )
        ) {
          toast.error(
            "A format with this name already exists for this section and media type"
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
          type: "libraries", // Change to libraries
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
      setNewFormat({
        name: "",
        template: "",
        sectionId: "all",
        mediaType: activeMediaType, // Keep the current active media type
      });
      setIsEditing(false);
      setEditingFormat(null);

      toast.success(successMessage);

      // Restore scroll position
      restoreScrollPosition();
    } catch (err) {
      logError(
        isEditing
          ? "Failed to update library format"
          : "Failed to save library format",
        err
      );
      toast.error(
        isEditing ? "Failed to update format" : "Failed to save format"
      );
    }
  };

  // Handle edit button click
  const handleEdit = (format) => {
    // Set form values from the format
    setNewFormat({
      name: format.name,
      template: format.template,
      sectionId: format.sectionId || "all",
      mediaType: format.mediaType || activeMediaType, // Use format's media type or current active type
    });
    setIsEditing(true);
    setEditingFormat(format);

    // Change active media type tab to match the format being edited
    if (format.mediaType) {
      setActiveMediaType(format.mediaType);
    }

    // Get position of the format card being edited to maintain context
    const formatElement = document.getElementById(
      `format-${format.name.replace(/\s+/g, "-")}`
    );
    const scrollPosition = formatElement
      ? formatElement.offsetTop - 100
      : window.scrollY;

    // Scroll to the element position, not to the top
    window.scrollTo({
      top: scrollPosition,
      behavior: "smooth",
    });

    // Focus the template input with a slight delay to ensure scroll is complete
    setTimeout(() => {
      if (templateInputRef.current) {
        templateInputRef.current.focus();
      }
    }, 300);
  };

  // Handle canceling edit mode
  const handleCancelEdit = () => {
    saveScrollPosition();

    setIsEditing(false);
    setEditingFormat(null);
    setNewFormat({
      name: "",
      template: "",
      sectionId: "all",
      mediaType: activeMediaType, // Keep the current active media type
    });

    // Restore scroll position
    restoreScrollPosition();
  };

  // Handle format deletion
  const handleDelete = async (format) => {
    // Save current scroll position
    saveScrollPosition();

    try {
      const response = await fetch(`/api/formats`);
      const data = await response.json();
      // Change to use libraries array
      const currentFormats = data.libraries || [];

      // Remove format using name, sectionId, and mediaType
      const updatedFormats = currentFormats.filter(
        (f) =>
          !(
            f.name === format.name &&
            f.sectionId === format.sectionId &&
            f.mediaType === format.mediaType
          )
      );

      // Save updated formats
      const saveResponse = await fetch(`/api/formats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "libraries", // Change to libraries
          formats: updatedFormats,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to delete format");
      }

      // Update local state directly
      setFormats(updatedFormats);

      toast.success("Format deleted successfully");

      // If we were editing the deleted format, exit edit mode
      if (
        isEditing &&
        editingFormat &&
        editingFormat.name === format.name &&
        editingFormat.sectionId === format.sectionId &&
        editingFormat.mediaType === format.mediaType
      ) {
        handleCancelEdit();
      }

      // Restore scroll position
      restoreScrollPosition();
    } catch (err) {
      logError("Failed to delete library format", err);
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
          ...EXAMPLE_DATA[activeMediaType],
          section_id: selectedSection.section_id,
          section_name: selectedSection.name,
          section_type: selectedSection.type,
        });
      }
    } else {
      setPreviewData(EXAMPLE_DATA[activeMediaType]);
    }
  }, [newFormat.sectionId, sections, activeMediaType]);

  // Filter formats based on active media type
  const filteredFormats = useMemo(() => {
    return formats.filter(
      (format) => format.mediaType === activeMediaType || !format.mediaType
    );
  }, [formats, activeMediaType]);

  // Render loading state
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
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Icons.AlertCircle className="text-red-400" size={18} />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Media Type Tabs */}
      <div className="flex gap-2 mb-4">
        {["movies", "shows", "music"].map((type) => (
          <button
            key={type}
            onClick={() => {
              setActiveMediaType(type);
              setNewFormat((prev) => ({
                ...prev,
                mediaType: type,
                sectionId: "all",
              }));
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeMediaType === type
                ? "bg-accent-light text-accent-base"
                : "text-gray-400 hover:text-white hover:bg-gray-700/50"
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

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

      {/* Create/Edit Format Section */}
      <ThemedCard
        title={isEditing ? "Edit Format" : "Create New Format"}
        icon={isEditing ? Icons.Edit2 : Icons.PlusCircle}
        className="p-6"
        useAccentBorder={true}
      >
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
              <option value="all">
                All{" "}
                {activeMediaType.charAt(0).toUpperCase() +
                  activeMediaType.slice(1)}{" "}
                Sections
              </option>
              {sections
                .filter((section) => {
                  // Map section type to media type
                  const type = (section.type || "").toLowerCase();
                  if (activeMediaType === "movies" && type === "movie")
                    return true;
                  if (activeMediaType === "shows" && type === "show")
                    return true;
                  if (activeMediaType === "music" && type === "artist")
                    return true;
                  return false;
                })
                .map((section) => (
                  <option
                    key={String(
                      section.section_id || `section-${Math.random()}`
                    )}
                    value={section.section_id}
                  >
                    {section.name || "Unknown"} (ID:{" "}
                    {section.section_id || "N/A"})
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
              placeholder="e.g., {section_name} ({count} items) - Last updated {last_accessed:relative}"
            />
            <p className="text-theme-muted text-xs mt-2">
              Tip: For timestamps, you can use formats: default, short,
              relative, full, time (e.g., {"{last_accessed:relative}"})
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

          {/* Current Media Type Display */}
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
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
      {filteredFormats.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Icons.List className="text-accent-base" size={18} />
              {activeMediaType.charAt(0).toUpperCase() +
                activeMediaType.slice(1)}{" "}
              Formats
            </h3>
            <div className="px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/50">
              <span className="text-sm font-medium text-theme-muted">
                {filteredFormats.length} Format
                {filteredFormats.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {filteredFormats.map((format, index) => (
              <FormatCard
                key={`${format.name}-${format.sectionId}-${format.mediaType}-${index}`}
                format={format}
                onDelete={handleDelete}
                onEdit={handleEdit}
                previewValue={processTemplate(
                  format.template,
                  format.sectionId === "all"
                    ? previewData
                    : {
                        ...previewData,
                        section_id: format.sectionId,
                        section_name:
                          sections.find(
                            (s) => s.section_id?.toString() === format.sectionId
                          )?.name || "Unknown Section",
                        section_type:
                          sections.find(
                            (s) => s.section_id?.toString() === format.sectionId
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

export default LibrariesFormat;
