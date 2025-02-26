import React, { useState, useEffect, useRef, useMemo } from "react";
import { Trash2, Code, Plus, Variable, AlertCircle } from "lucide-react";
import { useConfig } from "../../context/ConfigContext";
import axios from "axios";
import toast from "react-hot-toast";

// Constants and Configuration
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

// Example Data for Preview
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

// Available Variables
const AVAILABLE_VARIABLES = [
  { name: "section_id", description: "Unique library identifier" },
  { name: "section_name", description: "Name of the library" },
  {
    name: "section_type",
    description: "Type of library (movie, show, artist)",
  },
  { name: "count", description: "Total number of primary items" },
  {
    name: "parent_count",
    description: "Number of parent items (e.g., shows, albums)",
  },
  {
    name: "child_count",
    description: "Total number of child items (e.g., episodes, tracks)",
  },
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
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
  }
};

// Template Processing Utility
const processTemplate = (template, data) => {
  if (!template) return "";

  let result = template;
  const variables = template.match(/\{([^}]+)\}/g) || [];

  variables.forEach((variable) => {
    const match = variable.slice(1, -1).split(":");
    const key = match[0];
    const format = match[1] || "default";

    let value;

    // Special handling for timestamp fields
    if (key === "last_accessed" || key === "last_played") {
      value = formatDate(data[key], format);
    } else {
      // Default handling for other variables
      value = data[key];
    }

    if (value !== undefined) {
      result = result.replace(variable, value);
    }
  });

  return result;
};

// Variable Button Component
const VariableButton = ({ variable, onClick }) => (
  <button
    onClick={() => onClick(variable.name)}
    className="bg-gray-800/50 p-4 rounded-lg text-left hover:bg-gray-800/70 
        border border-gray-700/50 transition-all duration-200 group"
  >
    <div className="flex items-start justify-between">
      <div>
        <code className="text-brand-primary-400 font-mono">
          {variable.isDate
            ? `{${variable.name}:relative}`
            : `{${variable.name}}`}
        </code>
        <p className="text-gray-400 text-sm mt-2">{variable.description}</p>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Plus className="text-brand-primary-400" size={16} />
      </div>
    </div>
  </button>
);

// Format Card Component
const FormatCard = ({ format, onDelete, previewValue }) => (
  <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/70 transition-all duration-200">
    <div className="flex justify-between items-center mb-3">
      <div>
        <h4 className="text-white font-medium">{format.name}</h4>
        <p className="text-sm text-gray-400">
          Applied to:{" "}
          {format.sectionId === "all"
            ? "All Libraries"
            : `Section ${format.sectionId}`}
        </p>
      </div>
      <button
        onClick={() => onDelete(format)}
        className="text-gray-400 hover:text-red-400 p-1.5 hover:bg-red-400/10 rounded-lg transition-colors"
      >
        <Trash2 size={16} />
      </button>
    </div>
    <div className="space-y-3">
      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
          <Code size={14} />
          <span>Template</span>
        </div>
        <code className="text-sm text-gray-300 font-mono">
          {format.template}
        </code>
      </div>
      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
          <Variable size={14} />
          <span>Preview</span>
        </div>
        <code className="text-sm text-brand-primary-400 font-mono">
          {previewValue}
        </code>
      </div>
    </div>
  </div>
);

const LibrariesFormat = () => {
  const { config } = useConfig();
  const [activeMediaType, setActiveMediaType] = useState("movies");
  const [formats, setFormats] = useState([]);
  const [sections, setSections] = useState([]);
  const [newFormat, setNewFormat] = useState({
    name: "",
    template: "",
    sectionId: "all",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const templateInputRef = useRef(null);

  // Fetch sections
  const fetchSections = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/libraries`);

      // Safely process sections
      const processedSections = (response.data.libraries || [])
        .map((library) => {
          const rawData = library.raw_data || library;
          return {
            section_id: rawData.section_id,
            name: rawData.section_name || rawData.name,
            type: rawData.section_type || rawData.type,
          };
        })
        .filter(
          (section) =>
            section.type.toLowerCase() === activeMediaType.slice(0, -1)
        );

      setSections(processedSections);
    } catch (error) {
      console.error("Failed to fetch libraries:", error);
      setError("Failed to load libraries");
    }
  };

  // Fetch formats from the API
  const fetchFormats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/formats`);
      const data = await response.json();

      // Get the media type
      const mediaTypeMap = {
        movies: "movie",
        shows: "show",
        music: "artist",
      };
      const currentMediaType = mediaTypeMap[activeMediaType];

      // Filter sections formats by current media type
      const libraryFormats = (data.sections || []).filter(
        (format) => format.sectionType === currentMediaType
      );

      setFormats(libraryFormats);
    } catch (err) {
      console.error("Failed to fetch formats:", err);
      setError("Failed to load formats");
    }
  };

  // Get preview data for templates
  const getPreviewData = (sectionId) => {
    let previewData = { ...EXAMPLE_DATA[activeMediaType] };

    // If a specific section is selected, try to find a matching section
    if (sectionId !== "all") {
      const matchingSection = sections.find(
        (s) => s.section_id.toString() === sectionId.toString()
      );

      if (matchingSection) {
        previewData.section_id = matchingSection.section_id;
        previewData.section_name = matchingSection.name;
      }
    }

    return previewData;
  };

  // Load data when component mounts or media type changes
  useEffect(() => {
    fetchSections();
    fetchFormats();
  }, [activeMediaType]);

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

  // Memoized preview for the template
  const templatePreview = useMemo(() => {
    const previewData = getPreviewData(newFormat.sectionId);
    return processTemplate(newFormat.template || "", previewData);
  }, [newFormat.template, newFormat.sectionId, sections]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newFormat.name || !newFormat.template) return;

    try {
      // Get current formats
      const response = await fetch(`${API_BASE_URL}/api/formats`);
      const data = await response.json();
      const currentFormats = data.sections || [];

      // Get media type
      const mediaTypeMap = {
        movies: "movie",
        shows: "show",
        music: "artist",
      };
      const currentMediaType = mediaTypeMap[activeMediaType];

      // Check for duplicate names for this media type
      if (
        currentFormats.some(
          (f) =>
            f.name === newFormat.name &&
            f.sectionType === currentMediaType &&
            f.sectionId === newFormat.sectionId
        )
      ) {
        toast.error("A format with this name already exists for this section", {
          style: {
            border: "1px solid #DC2626",
            padding: "16px",
            background: "#7F1D1D",
          },
        });
        return;
      }

      // Prepare new format object
      const newFormatItem = {
        name: newFormat.name,
        template: newFormat.template,
        sectionType: currentMediaType,
        sectionId: newFormat.sectionId || "all",
      };

      // Add new format and save
      const updatedFormats = [...currentFormats, newFormatItem];
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
      setNewFormat({
        name: "",
        template: "",
        sectionId: "all",
      });

      toast.success("Format created successfully", {
        style: {
          border: "1px solid #059669",
          padding: "16px",
          background: "#064E3B",
        },
      });
    } catch (err) {
      console.error("Failed to save library format:", err);
      toast.error("Failed to save format", {
        style: {
          border: "1px solid #DC2626",
          padding: "16px",
          background: "#7F1D1D",
        },
      });
    }
  };

  // Handle format deletion
  const handleDelete = async (formatToDelete) => {
    try {
      // Get current formats
      const response = await fetch(`${API_BASE_URL}/api/formats`);
      const data = await response.json();
      const currentFormats = data.sections || [];

      // Remove specific format
      const updatedFormats = currentFormats.filter(
        (format) =>
          !(
            format.name === formatToDelete.name &&
            format.sectionType === formatToDelete.sectionType &&
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
          type: "sections",
          formats: updatedFormats,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save formats");
      }

      // Refresh formats
      fetchFormats();

      toast.success("Format deleted successfully", {
        style: {
          border: "1px solid #059669",
          padding: "16px",
          background: "#064E3B",
        },
      });
    } catch (error) {
      console.error("Failed to delete library format:", error);
      toast.error("Failed to delete format", {
        style: {
          border: "1px solid #DC2626",
          padding: "16px",
          background: "#7F1D1D",
        },
      });
    }
  };
  // Render method
  return (
    <div className="space-y-8">
      {/* Media Type Tabs */}
      <div className="flex gap-2 mb-4">
        {["movies", "shows", "music"].map((type) => (
          <button
            key={type}
            onClick={() => {
              setActiveMediaType(type);
              setNewFormat((prev) => ({
                ...prev,
                sectionId: "all",
              }));
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeMediaType === type
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-700/50"
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-brand-primary-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-gray-400">Loading Formats...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Available Variables Section */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">
          Available Variables
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AVAILABLE_VARIABLES.map((variable) => (
            <VariableButton
              key={variable.name}
              variable={variable}
              onClick={insertVariable}
            />
          ))}
        </div>
      </div>

      {/* Create New Format Section */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-6">
          Create New Format
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 font-medium mb-2">
              Format Name
            </label>
            <input
              type="text"
              value={newFormat.name}
              onChange={(e) =>
                setNewFormat({ ...newFormat, name: e.target.value })
              }
              className="w-full bg-gray-900/50 text-white border border-gray-700/50 rounded-lg px-4 py-3
                focus:ring-2 focus:ring-brand-primary-500 focus:border-brand-primary-500 
                transition-all duration-200"
              placeholder="e.g., Library Status Format"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-2">
              Section
            </label>
            <select
              value={newFormat.sectionId}
              onChange={(e) =>
                setNewFormat({ ...newFormat, sectionId: e.target.value })
              }
              className="w-full bg-gray-900/50 text-white border border-gray-700/50 rounded-lg px-4 py-3
                focus:ring-2 focus:ring-brand-primary-500 focus:border-brand-primary-500 
                transition-all duration-200"
            >
              <option value="all">All Libraries</option>
              {sections.map((section) => (
                <option key={section.section_id} value={section.section_id}>
                  {section.name} (ID: {section.section_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-2">
              Template
              <span className="text-gray-400 text-sm ml-2">
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
                focus:ring-2 focus:ring-brand-primary-500 focus:border-brand-primary-500 
                transition-all duration-200 font-mono"
              placeholder={
                activeMediaType === "movies"
                  ? "e.g., {section_name} - {count} Movies"
                  : activeMediaType === "shows"
                  ? "e.g., {section_name}: {parent_count} Shows, {child_count} Episodes"
                  : "e.g., {section_name} - {count} Artists"
              }
            />
            <p className="text-gray-400 text-xs mt-2">
              Tip: For timestamps, use formats: default, short, relative, full,
              time
            </p>
          </div>

          {/* Live Preview */}
          {newFormat.template && (
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
              <label className="block text-gray-300 font-medium mb-2">
                Preview
              </label>
              <code className="text-brand-primary-400 font-mono block">
                {templatePreview || "Invalid template"}
              </code>
            </div>
          )}

          <button
            type="submit"
            disabled={!newFormat.name || !newFormat.template}
            className="px-6 py-2 bg-brand-primary-500 text-white rounded-lg hover:bg-brand-primary-600 
              transition-all duration-200 shadow-lg shadow-brand-primary-500/20 
              hover:shadow-brand-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2"
          >
            <Plus size={16} />
            Add Format
          </button>
        </form>
      </div>

      {/* Existing Formats Section */}
      {formats.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Existing Formats
            </h3>
            <div className="px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/50">
              <span className="text-sm font-medium text-gray-400">
                {formats.length} Format{formats.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {formats.map((format, index) => {
              const previewData = getPreviewData(format.sectionId || "all");
              const previewValue = processTemplate(
                format.template,
                previewData
              );

              return (
                <FormatCard
                  key={`${format.name}-${format.sectionId}-${index}`}
                  format={format}
                  onDelete={handleDelete}
                  previewValue={previewValue}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LibrariesFormat;
