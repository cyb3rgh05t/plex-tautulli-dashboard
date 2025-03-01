// with theme styling applied

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Trash2, Code, Plus, Variable } from "lucide-react";
import * as Icons from "lucide-react";
import toast from "react-hot-toast";
import ThemedCard from "../common/ThemedCard";
import ThemedButton from "../common/ThemedButton";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

const AVAILABLE_VARIABLES = [
  { name: "title", description: "Title of the media" },
  { name: "subtitle", description: "Movie or episode title" },
  { name: "progress", description: "Download progress percentage" },
  { name: "type", description: "Activity type" },
  { name: "uuid", description: "Unique identifier" },
];

// Example data for preview
const EXAMPLE_DATA = {
  uuid: "abc123",
  title: "Media download by Username",
  subtitle: "Matrix",
  progress: 45,
  type: "download",
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

const FormatCard = ({ format, onDelete, previewValue }) => (
  <ThemedCard
    isInteractive
    hasBorder
    useAccentBorder={true}
    className="p-4 hover:shadow-accent-sm transition-all duration-200"
  >
    <div className="flex justify-between items-center mb-3">
      <h4 className="text-white font-medium">{format.name}</h4>
      <ThemedButton
        onClick={() => onDelete(format.name)}
        variant="ghost"
        size="sm"
        icon={Trash2}
        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
      />
    </div>
    <div className="space-y-3">
      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
        <div className="flex items-center gap-2 text-theme-muted text-sm mb-2">
          <Code size={14} className="text-accent-base" />
          <span>Template</span>
        </div>
        <code className="text-sm text-theme font-mono">{format.template}</code>
      </div>
      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
        <div className="flex items-center gap-2 text-theme-muted text-sm mb-2">
          <Variable size={14} className="text-accent-base" />
          <span>Preview</span>
        </div>
        <code className="text-sm text-accent-base font-mono">
          {previewValue}
        </code>
      </div>
    </div>
  </ThemedCard>
);

const DownloadsFormat = () => {
  const [formats, setFormats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newFormat, setNewFormat] = useState({
    name: "",
    template: "",
  });
  const templateInputRef = useRef(null);

  // Template preview using memoization
  const templatePreview = useMemo(() => {
    if (!newFormat.template) return "";

    let result = newFormat.template;
    Object.entries(EXAMPLE_DATA).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{${key}}`, "g"), value);
    });

    return result;
  }, [newFormat.template]);

  // Load formats
  useEffect(() => {
    const fetchFormats = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/formats`);
        const data = await response.json();
        setFormats(data.downloads || []);
      } catch (error) {
        console.error("Failed to load activity formats:", error);
        toast.error("Failed to load formats", {
          style: {
            border: "1px solid #DC2626",
            padding: "16px",
            background: "#7F1D1D",
          },
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchFormats();
  }, []);

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

  const handleAddFormat = async () => {
    if (newFormat.name && newFormat.template) {
      const newFormatItem = {
        name: newFormat.name,
        template: newFormat.template,
      };

      try {
        // Check for duplicate names
        const getResponse = await fetch(`${API_BASE_URL}/api/formats`);
        const currentData = await getResponse.json();
        const currentFormats = currentData.downloads || [];

        if (
          currentFormats.some((format) => format.name === newFormatItem.name)
        ) {
          toast.error("A format with this name already exists", {
            style: {
              border: "1px solid #DC2626",
              padding: "16px",
              background: "#7F1D1D",
            },
          });
          return;
        }

        // Add new format
        const updatedFormats = [...currentFormats, newFormatItem];

        // Save the updated formats
        const saveResponse = await fetch(`${API_BASE_URL}/api/formats`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "downloads",
            formats: updatedFormats,
          }),
        });

        if (!saveResponse.ok) {
          throw new Error("Failed to save format");
        }

        // Update local state
        setFormats(updatedFormats);
        toast.success(`Format "${newFormat.name}" created successfully`, {
          style: {
            border: "1px solid #059669",
            padding: "16px",
            background: "#064E3B",
          },
        });

        // Reset form
        setNewFormat({
          name: "",
          template: "",
        });
      } catch (error) {
        console.error("Failed to save format:", error);
        toast.error("Failed to create format", {
          style: {
            border: "1px solid #DC2626",
            padding: "16px",
            background: "#7F1D1D",
          },
        });
      }
    }
  };

  const handleDeleteFormat = async (formatName) => {
    const updatedFormats = formats.filter(
      (format) => format.name !== formatName
    );

    try {
      const saveResponse = await fetch(`${API_BASE_URL}/api/formats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "downloads",
          formats: updatedFormats,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save formats");
      }

      setFormats(updatedFormats);
      toast.success(`Format "${formatName}" deleted successfully`, {
        style: {
          border: "1px solid #059669",
          padding: "16px",
          background: "#064E3B",
        },
      });
    } catch (error) {
      console.error("Failed to delete format:", error);
      toast.error("Failed to delete format", {
        style: {
          border: "1px solid #DC2626",
          padding: "16px",
          background: "#7F1D1D",
        },
      });
    }
  };
  {
    /* Loading Indicator */
  }
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
      {/* Available Variables Section */}
      <ThemedCard
        title="Available Variables"
        icon={Variable}
        className="shadow-lg p-6"
        useAccentBorder={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AVAILABLE_VARIABLES.map((variable) => (
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
        icon={Plus}
        className="shadow-lg p-6"
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
              onChange={(e) =>
                setNewFormat({ ...newFormat, name: e.target.value })
              }
              className="w-full bg-gray-900/50 text-white border border-gray-700/50 rounded-lg px-4 py-3
                focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                transition-all duration-200"
              placeholder="e.g., Custom Format 1"
            />
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
              placeholder="e.g., {title} - {progress}%"
            />
          </div>

          {/* Live Preview */}
          {newFormat.template && (
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
              <label className="block text-theme font-medium mb-2">
                Preview
              </label>
              <code className="text-accent-base font-mono block">
                {templatePreview || "Invalid template"}
              </code>
            </div>
          )}

          <ThemedButton
            onClick={handleAddFormat}
            disabled={!newFormat.name || !newFormat.template}
            variant="accent"
            icon={Plus}
          >
            Add Format
          </ThemedButton>
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
              const previewValue = (() => {
                let result = format.template;
                Object.entries(EXAMPLE_DATA).forEach(([key, value]) => {
                  result = result.replace(new RegExp(`{${key}}`, "g"), value);
                });
                return result;
              })();
              return (
                <FormatCard
                  key={index}
                  format={format}
                  onDelete={handleDeleteFormat}
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

export default DownloadsFormat;
