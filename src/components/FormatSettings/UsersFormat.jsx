import React, { useState, useEffect, useRef } from "react";
import { Trash2, Code, Plus, Variable } from "lucide-react";
import { useConfig } from "../../context/ConfigContext";
import { logError } from "../../utils/logger";
import toast from "react-hot-toast";
import { formatDuration } from "./duration-formatter"; // Import the new formatter

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

// Available variables for different media types
const BASE_VARIABLES = [
  { name: "friendly_name", description: "User's display name" },
  { name: "email", description: "User's email address" },
  { name: "user_id", description: "Unique user identifier" },
  { name: "plays", description: "Total number of plays" },
  {
    name: "duration",
    description: "Total watch time (raw value in seconds)",
  },
  {
    name: "formatted_duration",
    description: "Formatted total watch time (e.g., '2h 21m')",
  },
  {
    name: "last_seen",
    description:
      "Last activity timestamp (formats: default, short, relative, full, time)",
    isDate: true,
  },
  {
    name: "last_seen_formatted",
    description: "Pre-formatted last seen time (e.g., '2 hrs ago')",
  },
  { name: "is_active", description: "User's active status (true/false)" },
  {
    name: "is_watching",
    description: "Watching status ('Watching'/'Watched')",
  },
  { name: "state", description: "Current watching state (watching/watched)" },
  { name: "media_type", description: "Type of media (Movie/Episode)" },
  {
    name: "progress_percent",
    description: "Current viewing progress percentage",
  },
  { name: "progress_time", description: "Current viewing progress time" },
  { name: "last_played", description: "Title of last played content" },
  {
    name: "last_played_modified",
    description: "Modified status of last played content",
  },
];

const MOVIE_VARIABLES = [
  { name: "title", description: "Movie title" },
  { name: "original_title", description: "Original movie title if different" },
  { name: "year", description: "Release year" },
  {
    name: "full_title",
    description: "Complete title including year or additional info",
  },
];

const SHOW_VARIABLES = [
  { name: "full_title", description: "Complete episode title" },
  { name: "title", description: "Episode title" },
  { name: "parent_title", description: "Season title" },
  { name: "grandparent_title", description: "Show title" },
  {
    name: "original_title",
    description: "Original episode title if different",
  },
  { name: "year", description: "Release year" },
  { name: "media_index", description: "Episode number" },
  { name: "parent_media_index", description: "Season number" },
];

// Helper Components
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

const FormatCard = ({ format, onDelete, previewValue }) => (
  <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/70 transition-all duration-200">
    <div className="flex justify-between items-center mb-3">
      <h4 className="text-white font-medium">{format.name}</h4>
      <button
        onClick={() => onDelete(format.name)}
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

const MediaTypeTab = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      active
        ? "bg-gray-700 text-white"
        : "text-gray-400 hover:text-white hover:bg-gray-700/50"
    }`}
  >
    {children}
  </button>
);

// Helper function for date formatting
const formatDate = (timestamp, format = "default") => {
  // Return early if no timestamp
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

// Format state helper
const formatState = (state) => {
  if (state === "playing") return "watching";
  if (!state) return "watched";
  return state;
};

const processTemplate = (template, data) => {
  if (!template || !data) return "";

  // Create a combined data object that includes both raw_data and top-level properties
  const combinedData = {
    ...(data.raw_data || {}), // Include raw_data properties if they exist
    ...data, // Include top-level properties (will override any duplicate keys)
  };

  let result = template;
  const variables = template.match(/\{([^}]+)\}/g) || [];

  variables.forEach((variable) => {
    const match = variable.slice(1, -1).split(":");
    const key = match[0];
    const format = match[1] || "default";

    let value;
    try {
      switch (key) {
        case "duration":
          // Prefer formatted_duration if available, otherwise format it
          value =
            combinedData.formatted_duration ||
            (combinedData.duration
              ? formatDuration(Number(combinedData.duration))
              : "0m");
          break;

        case "last_seen":
          // Use formatting if requested, otherwise use pre-formatted value
          if (format && format !== "default") {
            value = combinedData.last_seen
              ? formatDate(combinedData.last_seen, format)
              : "Never";
          } else {
            value =
              combinedData.last_seen_formatted ||
              (combinedData.last_seen
                ? formatDate(combinedData.last_seen, "relative")
                : "Never");
          }
          break;

        case "is_active":
          value = combinedData[key] ? "Active" : "Inactive";
          break;

        case "state":
          value = formatState(combinedData[key] || "watched");
          break;

        case "media_index":
        case "parent_media_index":
          // Format as 2-digit number if present
          value = combinedData[key]
            ? String(combinedData[key]).padStart(2, "0")
            : "";
          break;

        default:
          // Use the value from combined data if available
          value = combinedData[key] !== undefined ? combinedData[key] : "";
      }
    } catch (error) {
      console.error(`Error processing variable ${key}:`, error);
      value = "";
    }

    if (value !== undefined) {
      result = result.replace(variable, value);
    }
  });

  return result;
};

const UsersFormat = () => {
  const { config } = useConfig();
  const [formats, setFormats] = useState([]);
  const [newFormat, setNewFormat] = useState({ name: "", template: "" });
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState(null);
  const [error, setError] = useState(null);
  const [activeMediaType, setActiveMediaType] = useState("movies");
  const templateInputRef = useRef(null);

  // Get current variables based on media type
  const getCurrentVariables = () => {
    const variables = [...BASE_VARIABLES];
    if (activeMediaType === "movies") {
      variables.push(...MOVIE_VARIABLES);
    } else {
      variables.push(...SHOW_VARIABLES);
    }
    return variables;
  };

  // Fetch formats from the API
  const fetchFormats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/formats`);
      const data = await response.json();

      // Filter formats by specific media type
      const mediaTypeMap = {
        shows: "episode",
        movies: "movie",
      };
      const filteredFormats = (data.users || []).filter(
        (format) => format.mediaType === mediaTypeMap[activeMediaType]
      );
      setFormats(filteredFormats);
    } catch (err) {
      logError("Failed to fetch user formats", err);
      setError("Failed to load formats");
      toast.error("Failed to load formats", {
        style: {
          border: "1px solid #DC2626",
          padding: "16px",
          background: "#7F1D1D",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviewData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`);
      const data = await response.json();

      if (data.users && data.users.length > 0) {
        // Convert media type to match the expected format
        const targetMediaType =
          activeMediaType === "shows" ? "episode" : "movie";

        // Find a user with the right media type (case insensitive)
        const matchingTypeUser = data.users.find((u) => {
          const mediaType = (
            (u.raw_data && u.raw_data.media_type) ||
            ""
          ).toLowerCase();
          return mediaType === targetMediaType.toLowerCase();
        });

        // Use the matching type user, or fallback to the first user
        const selectedUser = matchingTypeUser || data.users[0];

        if (!selectedUser) {
          const placeholderUser = {
            raw_data: {
              friendly_name: "Example User",
              media_type: targetMediaType,
              title:
                targetMediaType === "movie"
                  ? "Example Movie"
                  : "Example Episode",
              grandparent_title: "Example Show",
              parent_media_index: "01",
              media_index: "05",
              state: "watched",
              duration: 6000,
              formatted_duration: "1h 40m",
              last_seen: Date.now() / 1000 - 3600, // 1 hour ago
              last_seen_formatted: "1 hour ago",
            },
          };
          setPreviewData(placeholderUser);
          return;
        }

        console.log("Preview Data:", selectedUser);

        // Extract formatted fields (anything outside raw_data)
        const formattedFields = Object.keys(selectedUser).filter(
          (key) => key !== "raw_data"
        );
        console.log(
          "Available formatted fields:",
          formattedFields.reduce((obj, key) => {
            obj[key] = selectedUser[key];
            return obj;
          }, {})
        );

        // Use the entire structure for preview data
        setPreviewData(selectedUser);
      }
    } catch (err) {
      logError("Failed to fetch preview data", err);
    }
  };

  // Load data when component mounts or media type changes
  useEffect(() => {
    fetchFormats();
    fetchPreviewData();
  }, [activeMediaType]);

  // Insert variable into template
  const insertVariable = (variableName) => {
    if (templateInputRef.current) {
      const input = templateInputRef.current;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const currentValue = newFormat.template;

      // Add format option for last_seen
      const insertValue =
        variableName === "last_seen"
          ? `{${variableName}:relative}`
          : `{${variableName}}`;

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

  // Handle form submission for new format
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newFormat.name || !newFormat.template) return;

    try {
      // Get current formats
      const response = await fetch(`${API_BASE_URL}/api/formats`);
      const data = await response.json();
      const currentFormats = data.users || [];

      // Convert media type for backend
      const mediaTypeMap = {
        shows: "episode",
        movies: "movie",
      };
      const currentMediaType = mediaTypeMap[activeMediaType];

      // Check for duplicate names for this media type
      if (
        currentFormats.some(
          (f) => f.name === newFormat.name && f.mediaType === currentMediaType
        )
      ) {
        toast.error(
          "A format with this name already exists for this media type",
          {
            style: {
              border: "1px solid #DC2626",
              padding: "16px",
              background: "#7F1D1D",
            },
          }
        );
        return;
      }

      const newFormatWithType = {
        name: newFormat.name,
        template: newFormat.template,
        mediaType: currentMediaType,
      };

      // Add new format and save
      const updatedFormats = [...currentFormats, newFormatWithType];
      const saveResponse = await fetch(`${API_BASE_URL}/api/formats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "users",
          formats: updatedFormats,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save format");
      }

      // Refresh formats and reset form
      fetchFormats();
      setNewFormat({ name: "", template: "" });
      toast.success("Format created successfully", {
        style: {
          border: "1px solid #059669",
          padding: "16px",
          background: "#064E3B",
        },
      });
    } catch (err) {
      logError("Failed to save user format", err);
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
  const handleDelete = async (formatName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/formats`);
      const data = await response.json();
      const currentFormats = data.users || [];

      const mediaTypeMap = {
        shows: "episode",
        movies: "movie",
      };
      const currentMediaType = mediaTypeMap[activeMediaType];

      // Remove specific format for current media type
      const updatedFormats = currentFormats.filter(
        (f) => !(f.name === formatName && f.mediaType === currentMediaType)
      );

      // Save updated formats
      const saveResponse = await fetch(`${API_BASE_URL}/api/formats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "users",
          formats: updatedFormats,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to delete format");
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
    } catch (err) {
      logError("Failed to delete user format", err);
      toast.error("Failed to delete format", {
        style: {
          border: "1px solid #DC2626",
          padding: "16px",
          background: "#7F1D1D",
        },
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Media Type Tabs */}
      <div className="flex gap-2 mb-4">
        <MediaTypeTab
          active={activeMediaType === "movies"}
          onClick={() => setActiveMediaType("movies")}
        >
          Movies
        </MediaTypeTab>
        <MediaTypeTab
          active={activeMediaType === "shows"}
          onClick={() => setActiveMediaType("shows")}
        >
          TV Shows
        </MediaTypeTab>
      </div>

      {/* Loading Indicator */}
      {loading && (
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
          Available Variables for{" "}
          {activeMediaType === "shows" ? "TV Shows" : "Movies"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {getCurrentVariables().map((variable) => (
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
              placeholder={`e.g., ${
                activeMediaType === "shows" ? "Show" : "Movie"
              } Format`}
            />
            <p className="text-green-700 text-xs mt-2">
              For best results, you should name the Custom Format fields the
              same in both categories
            </p>
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
                activeMediaType === "shows"
                  ? "e.g., {friendly_name} is {state} {grandparent_title} S{parent_media_index}E{media_index}"
                  : "e.g., {friendly_name} is {state} {title} ({year})"
              }
            />
            <p className="text-gray-400 text-xs mt-2">
              Tip: For last_seen, you can use formats: default, short, relative,
              full, time (e.g., {"{last_seen:relative}"})
            </p>
          </div>

          {/* Live Preview */}
          {newFormat.template && previewData && (
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
              <label className="block text-gray-300 font-medium mb-2">
                Preview
              </label>
              <code className="text-brand-primary-400 font-mono block">
                {processTemplate(newFormat.template, previewData)}
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
              Existing {activeMediaType === "shows" ? "TV Show" : "Movie"}{" "}
              Formats
            </h3>
            <div className="px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/50">
              <span className="text-sm font-medium text-gray-400">
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
                previewValue={
                  previewData
                    ? processTemplate(format.template, previewData)
                    : ""
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersFormat;
