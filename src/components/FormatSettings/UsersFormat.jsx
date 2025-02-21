import React, { useState, useEffect, useRef } from "react";
import { Trash2, Code, Plus, Variable } from "lucide-react";
import { useConfig } from "../../context/ConfigContext";
import { logError } from "../../utils/logger";
import toast from "react-hot-toast";

const BASE_VARIABLES = [
  { name: "friendly_name", description: "User's display name" },
  { name: "email", description: "User's email address" },
  { name: "plays", description: "Total number of plays" },
  {
    name: "duration",
    description: "Total watch time (auto-formatted to hours)",
  },
  {
    name: "last_seen",
    description: "Last activity timestamp (auto-formatted)",
  },
  { name: "is_active", description: "User's active status (auto-formatted)" },
  { name: "state", description: "Current watching state (watching/watched)" },
  {
    name: "last_played_at",
    description: "Last played timestamp (auto-formatted)",
  },
  { name: "media_type", description: "Type of media (movie/episode)" },
];

const MOVIE_VARIABLES = [
  { name: "title", description: "Movie title" },
  { name: "original_title", description: "Original movie title if different" },
  { name: "year", description: "Release year" },
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

const VariableButton = ({ variable, onClick }) => (
  <button
    onClick={() => onClick(variable.name)}
    className="bg-gray-800/50 p-4 rounded-lg text-left hover:bg-gray-800/70 
      border border-gray-700/50 transition-all duration-200 group"
  >
    <div className="flex items-start justify-between">
      <div>
        <code className="text-brand-primary-400 font-mono">{`{${variable.name}}`}</code>
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

const UsersFormat = () => {
  const { config } = useConfig();
  const [formats, setFormats] = useState([]);
  const [newFormat, setNewFormat] = useState({ name: "", template: "" });
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState(null);
  const [error, setError] = useState(null);
  const [activeMediaType, setActiveMediaType] = useState("shows");
  const templateInputRef = useRef(null);

  useEffect(() => {
    fetchFormats();
    fetchPreviewData();
  }, []);

  const fetchFormats = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3006/api/formats");
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
      toast.error("Failed to load formats");
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviewData = async () => {
    try {
      const response = await fetch("http://localhost:3006/api/users");
      const data = await response.json();
      if (data.users && data.users.length > 0) {
        // Find a user with the current media type
        const user =
          data.users.find((u) => u.media_type === activeMediaType) ||
          data.users[0];
        setPreviewData(user);
      }
    } catch (err) {
      logError("Failed to fetch preview data", err);
    }
  };

  useEffect(() => {
    fetchFormats();
    fetchPreviewData();
  }, [activeMediaType]);

  const getCurrentVariables = () => {
    const variables = [...BASE_VARIABLES];
    if (activeMediaType === "movies") {
      variables.push(...MOVIE_VARIABLES);
    } else {
      variables.push(...SHOW_VARIABLES);
    }
    return variables;
  };

  const formatState = (state) => {
    if (state === "playing") return "watching";
    if (!state) return "watched";
    return state;
  };

  const insertVariable = (variableName) => {
    if (templateInputRef.current) {
      const input = templateInputRef.current;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const currentValue = newFormat.template;
      const newValue =
        currentValue.substring(0, start) +
        `{${variableName}}` +
        currentValue.substring(end);

      setNewFormat({ ...newFormat, template: newValue });

      setTimeout(() => {
        const newCursorPos = start + variableName.length + 2;
        input.focus();
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newFormat.name || !newFormat.template) return;

    try {
      // Get current formats
      const getResponse = await fetch("http://localhost:3006/api/formats");
      const currentData = await getResponse.json();
      const currentFormats = currentData.users || [];

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

      // Add new format to existing formats
      const updatedFormats = [...currentFormats, newFormatWithType];

      // Save formats
      const saveResponse = await fetch("http://localhost:3006/api/formats", {
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

      // Fetch and update local formats specifically for current media type
      fetchFormats();
      setNewFormat({ name: "", template: "" });
      toast.success("Format created successfully", {
        style: {
          border: "1px solid #059669",
          padding: "16px",
          background: "#064E3B",
        },
      });
      fetchPreviewData();
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

  const handleDelete = async (formatName) => {
    try {
      // Get current formats
      const getResponse = await fetch("http://localhost:3006/api/formats");
      const currentData = await getResponse.json();
      const currentFormats = currentData.users || [];

      // Convert media type for backend
      const mediaTypeMap = {
        shows: "episode",
        movies: "movie",
      };
      const currentMediaType = mediaTypeMap[activeMediaType];

      // Remove only the specific format for the current media type
      const updatedFormats = currentFormats.filter(
        (f) => !(f.name === formatName && f.mediaType === currentMediaType)
      );

      // Save updated formats
      const saveResponse = await fetch("http://localhost:3006/api/formats", {
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

      // Fetch and update local formats
      fetchFormats();
      toast.success("Format deleted successfully", {
        style: {
          border: "1px solid #059669",
          padding: "16px",
          background: "#064E3B",
        },
      });
      fetchPreviewData();
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

  const formatPreviewValue = (key, value) => {
    switch (key) {
      case "duration":
        return Math.round(value / 3600) + " hrs";
      case "last_seen":
      case "last_played_at":
        return value ? new Date(value * 1000).toLocaleString() : "Never";
      case "is_active":
        return value ? "Active" : "Inactive";
      case "state":
        return formatState(value);
      case "media_index":
      case "parent_media_index":
        return value ? String(value).padStart(2, "0") : "";
      case "year":
        return value || "";
      default:
        return value || "";
    }
  };

  return (
    <div className="space-y-8">
      {/* Loading Indicator */}
      {loading && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-brand-primary-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-gray-400">Loading Formats...</p>
        </div>
      )}

      {error && (
        <div className="w-full p-4 bg-red-900/20 rounded">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Media Type Tabs */}
      <div className="flex gap-2 mb-4">
        <MediaTypeTab
          active={activeMediaType === "shows"}
          onClick={() => setActiveMediaType("shows")}
        >
          TV Shows
        </MediaTypeTab>
        <MediaTypeTab
          active={activeMediaType === "movies"}
          onClick={() => setActiveMediaType("movies")}
        >
          Movies
        </MediaTypeTab>
      </div>

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
          </div>

          {/* Live Preview */}
          {newFormat.template && previewData && (
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
              <label className="block text-gray-300 font-medium mb-2">
                Preview
              </label>
              <code className="text-brand-primary-400 font-mono block">
                {(() => {
                  let result = newFormat.template;
                  Object.entries(previewData).forEach(([key, value]) => {
                    const formattedValue = formatPreviewValue(key, value);
                    if (formattedValue !== undefined) {
                      result = result.replace(
                        new RegExp(`{${key}}`, "g"),
                        formattedValue
                      );
                    }
                  });
                  return result;
                })()}
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
            {formats.map((format, index) => {
              const previewValue = (() => {
                if (!previewData) return "";
                let result = format.template;
                Object.entries(previewData).forEach(([key, value]) => {
                  const formattedValue = formatPreviewValue(key, value);
                  if (formattedValue !== undefined) {
                    result = result.replace(
                      new RegExp(`{${key}}`, "g"),
                      formattedValue
                    );
                  }
                });
                return result;
              })();
              return (
                <FormatCard
                  key={index}
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

export default UsersFormat;
