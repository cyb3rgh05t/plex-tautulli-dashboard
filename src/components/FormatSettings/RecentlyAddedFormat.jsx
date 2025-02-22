import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "react-query";
import axios from "axios";
import toast from "react-hot-toast";
import { useConfig } from "../../context/ConfigContext";
import { Trash2, Code, Plus, Variable } from "lucide-react";

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

    let value = data[key];

    // Special handling for date formatting
    if (key === "addedAt") {
      value = formatDate(value, format);
    }

    // Special handling for show episode formatting
    if (data.mediaType === "show") {
      if (key === "parent_media_index") {
        value = `S${String(value).padStart(2, "0")}`;
      }
      if (key === "media_index") {
        value = `E${String(value).padStart(2, "0")}`;
      }
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
  const templateInputRef = useRef(null);

  // Fetch sections
  const fetchSections = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/sections`);
      setSections(response.data.sections);
      return response.data.sections;
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

      const filteredSections = sections.filter(
        (section) => section.type.toLowerCase() === typeMap[activeMediaType]
      );

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
    const mediaItem =
      sectionId === "all"
        ? recentMedia[0]
        : recentMedia.find((item) => item.section_id === sectionId) ||
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

  const handleAddFormat = async () => {
    if (newFormat.name && newFormat.template && newFormat.type) {
      const newFormatItem = {
        name: newFormat.name,
        template: newFormat.template,
        type: activeMediaType,
        sectionId: newFormat.sectionId || "all",
      };

      try {
        // Get current formats
        const response = await fetch(`${API_BASE_URL}/api/formats`);
        const data = await response.json();
        const currentFormats = data.recentlyAdded || [];

        // Create a new array of formats
        const updatedFormats = [
          ...currentFormats.filter(
            (f) => f.type !== activeMediaType || f.name !== newFormatItem.name
          ),
          newFormatItem,
        ];

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

        // Update local state
        setFormats(updatedFormats.filter((f) => f.type === activeMediaType));

        toast.success(`Format created successfully`);

        // Reset form
        setNewFormat({
          name: "",
          template: "",
          type: activeMediaType,
          sectionId: "all",
        });
      } catch (error) {
        console.error("Failed to save format:", error);
        toast.error("Failed to save format");
      }
    }
  };

  const handleDeleteFormat = async (formatName) => {
    try {
      // Get current formats
      const response = await fetch(`${API_BASE_URL}/api/formats`);
      const data = await response.json();
      const currentFormats = data.recentlyAdded || [];

      // Remove the specific format
      const updatedFormats = currentFormats.filter(
        (format) =>
          !(format.name === formatName && format.type === activeMediaType)
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
      const savedSections = await fetchSections();
      const recentMedia = await fetchRecentMedia(savedSections);
      await fetchMediaMetadata(recentMedia);
    };

    loadMediaData();
  }, [activeMediaType]);

  // Filter sections and formats
  const filteredSections = sections.filter((section) => {
    const typeMap = {
      movies: "movie",
      shows: "show",
      music: "artist",
    };
    return section.type.toLowerCase() === typeMap[activeMediaType];
  });

  return (
    <div className="space-y-8">
      {/* Media Type Tabs */}
      <div className="flex gap-2 mb-4">
        {["movies", "shows", "music"].map((type) => (
          <button
            key={type}
            onClick={() => {
              setActiveMediaType(type);
              setNewFormat((prev) => ({ ...prev, type }));
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

      {/* Available Variables Section */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">
          Available Variables
        </h3>
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
      </div>

      {/* Create New Format Section */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-6">
          Create New Format
        </h3>
        <div className="space-y-4">
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
              placeholder="e.g., Custom Recently Added Format"
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
              <option value="all">All Sections</option>
              {filteredSections.map((section) => (
                <option key={section.section_id} value={section.section_id}>
                  {section.section_name || section.name} (ID:{" "}
                  {section.section_id})
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
                activeMediaType === "shows"
                  ? "e.g., {grandparent_title} S{parent_media_index}E{media_index} - {title}"
                  : activeMediaType === "movies"
                  ? "e.g., {title} ({video_full_resolution})"
                  : "e.g., {grandparent_title} - {title}"
              }
            />
            <p className="text-gray-400 text-xs mt-2">
              Tip: Use {`{addedAt:format}`} with formats: default, short,
              relative, full, time
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
            onClick={handleAddFormat}
            disabled={!newFormat.name || !newFormat.template}
            className="px-6 py-2 bg-brand-primary-500 text-white rounded-lg hover:bg-brand-primary-600 
              transition-all duration-200 shadow-lg shadow-brand-primary-500/20 
              hover:shadow-brand-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2"
          >
            <Plus size={16} />
            Add Format
          </button>
        </div>
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
              const previewValue = processTemplate(format.template, {
                ...previewData,
                mediaType: activeMediaType,
              });

              return (
                <FormatCard
                  key={index}
                  format={format}
                  onDelete={() => handleDeleteFormat(format.name)}
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

export default RecentlyAddedFormat;
