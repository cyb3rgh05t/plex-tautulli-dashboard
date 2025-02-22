import React, { useState, useEffect } from "react";
import { useQuery } from "react-query";
import { useConfig } from "../../context/ConfigContext";
import { logError } from "../../utils/logger";
import { Film, Tv, Music, Book, RefreshCw, Check, Save } from "lucide-react";
import toast from "react-hot-toast";

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};

const LibraryTypeIcon = ({ type }) => {
  switch (type.toLowerCase()) {
    case "movie":
      return <Film className="text-brand-primary-400" />;
    case "show":
      return <Tv className="text-green-400" />;
    case "artist":
      return <Music className="text-purple-400" />;
    default:
      return <Book className="text-yellow-400" />;
  }
};

const LibraryCard = ({ library, isSelected, onToggleSelect }) => {
  return (
    <div
      className={`bg-gray-800/30 hover:bg-gray-800/50 border rounded-xl p-4 transition-all duration-200
      ${
        isSelected
          ? "border-brand-primary-500/50 shadow-lg shadow-brand-primary-500/10"
          : "border-gray-700/50"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(library.section_id)}
            className="w-5 h-5 rounded border-gray-600 bg-gray-700 
              text-brand-primary-500 focus:ring-brand-primary-500 focus:ring-offset-gray-800"
          />
          <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <LibraryTypeIcon type={library.section_type} />
          </div>
          <div>
            <h3 className="text-white font-medium">{library.section_name}</h3>
            <p className="text-gray-400 text-sm">
              Type: {capitalizeFirstLetter(library.section_type)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-gray-800/50 px-3 py-1 rounded-lg border border-gray-700/50">
            <span className="text-gray-400 text-sm">Items: </span>
            <span className="text-brand-primary-400 font-medium">
              {library.count}
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-1">ID: {library.section_id}</p>
        </div>
      </div>
    </div>
  );
};

const Libraries = () => {
  const { config } = useConfig();
  const [selectedLibraries, setSelectedLibraries] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Fetch saved sections on component mount
  useEffect(() => {
    const fetchSavedSections = async () => {
      try {
        const response = await fetch("/api/sections");
        const data = await response.json();

        if (data.sections && data.sections.length) {
          const savedSectionIds = new Set(
            data.sections.map((section) => section.section_id)
          );
          setSelectedLibraries(savedSectionIds);
        }
      } catch (error) {
        console.error("Failed to fetch saved sections:", error);
      }
    };

    fetchSavedSections();
  }, []);

  const toggleLibrary = (sectionId) => {
    setSelectedLibraries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const toggleAll = (libraries) => {
    if (selectedLibraries.size === libraries.length) {
      setSelectedLibraries(new Set());
    } else {
      setSelectedLibraries(new Set(libraries.map((lib) => lib.section_id)));
    }
  };

  const {
    data: libraries,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery(
    ["libraries"],
    async () => {
      try {
        const response = await fetch("/api/libraries");
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Fetch error:", error);
        throw error;
      }
    },
    {
      enabled: !!config.tautulliApiKey,
    }
  );

  const handleSaveSections = async () => {
    if (selectedLibraries.size === 0) return;

    setIsSaving(true);
    const selectedData = libraries
      .filter((lib) => selectedLibraries.has(lib.section_id))
      .map((lib) => ({
        section_id: lib.section_id,
        type: lib.section_type,
        name: lib.section_name,
      }));

    try {
      const response = await fetch("/api/sections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedData),
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${responseText}`
        );
      }

      toast.success(`Successfully saved ${selectedData.length} sections`);
    } catch (error) {
      toast.error(`Failed to save sections: ${error.message}`);
      console.error("Detailed save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Plex Libraries
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <Film size={14} className="text-brand-primary-400" />
              <span className="text-gray-400 text-sm">
                {Array.isArray(libraries) ? libraries.length : 0} Libraries
              </span>
            </div>
            {isFetching && !isLoading && (
              <span className="text-xs text-gray-500">Refreshing...</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {Array.isArray(libraries) && libraries.length > 0 && (
            <button
              onClick={() => toggleAll(libraries)}
              className="px-4 py-2 bg-gray-800/50 text-gray-300 hover:text-white 
                hover:bg-gray-700 rounded-lg transition-colors border border-gray-700/50"
            >
              {selectedLibraries.size === libraries.length
                ? "Deselect All"
                : "Select All"}
            </button>
          )}
          <button
            onClick={handleSaveSections}
            disabled={selectedLibraries.size === 0 || isSaving}
            className={`px-4 py-2 rounded-lg bg-brand-primary-500/10 text-brand-primary-400 
              border border-brand-primary-500/20 hover:bg-brand-primary-500/20 
              transition-all duration-200 flex items-center gap-2
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Selection
              </>
            )}
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className={`px-4 py-2 rounded-lg bg-brand-primary-500/10 text-brand-primary-400 
              border border-brand-primary-500/20 hover:bg-brand-primary-500/20 
              transition-all duration-200 flex items-center gap-2
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <RefreshCw
              size={16}
              className={`${isFetching ? "animate-spin" : ""}`}
            />
            {isFetching ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-gray-800/30 rounded-xl p-4 animate-pulse border border-gray-700/50"
            >
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 bg-gray-700 rounded" />
                <div className="w-12 h-12 bg-gray-700 rounded-lg" />
                <div>
                  <div className="h-5 bg-gray-700 rounded w-32 mb-2" />
                  <div className="h-4 bg-gray-700 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400">
            Error loading libraries: {error.message}
          </p>
        </div>
      ) : !libraries?.length ? (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8 text-center">
          <Film size={24} className="text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No libraries found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {libraries.map((library) => (
            <LibraryCard
              key={library.section_id}
              library={library}
              isSelected={selectedLibraries.has(library.section_id)}
              onToggleSelect={toggleLibrary}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Libraries;
