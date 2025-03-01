// with theme styling applied

import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "react-query";
import { useConfig } from "../../context/ConfigContext";
import { logError } from "../../utils/logger";
import * as Icons from "lucide-react";
import toast from "react-hot-toast";
import ThemedCard from "../common/ThemedCard";
import ThemedButton from "../common/ThemedButton";
import { useTheme } from "../../context/ThemeContext";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};

const LibraryTypeIcon = ({ type }) => {
  switch (type.toLowerCase()) {
    case "movie":
      return <Icons.Film className="text-accent-base" />;
    case "show":
      return <Icons.Tv className="text-green-400" />;
    case "artist":
      return <Icons.Music className="text-purple-400" />;
    default:
      return <Icons.Book className="text-yellow-400" />;
  }
};

const LibraryCard = ({ library, isSelected, onToggleSelect }) => {
  const { accentColor } = useTheme();

  // Safely extract section ID and count
  const rawData = library.raw_data || library;
  const sectionId = rawData.section_id;
  const itemCount = rawData.count || rawData.parent_count || 0;
  const libraryType = rawData.section_type || rawData.type;

  // Get RGB value for current accent
  const getAccentRgb = () => {
    const accentColorMap = {
      default: "167, 139, 250",
      green: "109, 247, 81",
      purple: "166, 40, 140",
      orange: "255, 153, 0",
      blue: "0, 98, 255",
      red: "232, 12, 11",
    };

    return accentColorMap[accentColor] || accentColorMap.default;
  };

  const accentRgb = getAccentRgb();

  return (
    <div
      className={`transition-all duration-200 rounded-xl p-4 hover:bg-gray-800/50 ${
        isSelected ? "shadow-accent-md" : ""
      }`}
      style={{
        backgroundColor: "rgba(31, 41, 55, 0.5)",
        border: `1px solid rgba(${accentRgb}, ${isSelected ? "0.5" : "0.3"})`,
        marginBottom: "1rem",
      }}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(sectionId)}
              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-accent-base focus:ring-accent focus:ring-offset-gray-800"
            />
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <LibraryTypeIcon type={libraryType} />
            </div>
            <div>
              <h3 className="text-white font-medium">
                {rawData.section_name || rawData.name}
              </h3>
              <p className="text-theme-muted text-sm">
                Type: {capitalizeFirstLetter(libraryType)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-gray-800/50 px-3 py-1 rounded-lg border border-gray-700/50">
              <span className="text-theme-muted text-sm">Items: </span>
              <span className="text-accent-base font-medium">
                {itemCount.toLocaleString()}
              </span>
            </div>
            <p className="text-theme-muted text-xs mt-1">ID: {sectionId}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Libraries = () => {
  const { config } = useConfig();
  const [selectedLibraries, setSelectedLibraries] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const refreshInterval = useRef(null);
  const initialFetchDone = useRef(false);
  const REFRESH_INTERVAL = 600000; // 10 minutes in milliseconds

  // Fetch saved sections on component mount
  useEffect(() => {
    const fetchSavedSections = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sections`);
        const data = await response.json();

        if (data.sections && data.sections.length) {
          const savedIds = new Set(
            data.sections
              .filter(
                (section) =>
                  section && section.raw_data && section.raw_data.section_id
              )
              .map((section) => String(section.raw_data.section_id))
          );
          setSelectedLibraries(savedIds);
        }
      } catch (error) {
        console.error("Failed to fetch saved sections:", error);
      }
    };

    fetchSavedSections();
    setLastRefreshTime(Date.now());
  }, []);

  const toggleLibrary = (sectionId) => {
    setSelectedLibraries((prev) => {
      const newSet = new Set(prev);
      const strSectionId = String(sectionId);
      if (newSet.has(strSectionId)) {
        newSet.delete(strSectionId);
      } else {
        newSet.add(strSectionId);
      }
      return newSet;
    });
  };

  const toggleAll = (libraries) => {
    if (selectedLibraries.size === libraries.length) {
      setSelectedLibraries(new Set());
    } else {
      setSelectedLibraries(
        new Set(libraries.map((lib) => String(lib.raw_data.section_id)))
      );
    }
  };

  const fetchLibraries = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/libraries`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.libraries;
    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  };

  const {
    data: libraries,
    isLoading,
    error,
    refetch,
  } = useQuery(["libraries"], fetchLibraries, {
    enabled: !!config.tautulliApiKey,
    refetchOnWindowFocus: true, // Enable refetch on window focus for page reloads
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnReconnect: true, // Refetch on network reconnection
    staleTime: 300000, // 5 minutes
  });

  const handleRefresh = async () => {
    // Prevent multiple refreshes happening at once
    if (isRefreshing) {
      console.log("Skipping refresh - already in progress");
      return;
    }

    console.log("Starting libraries refresh");
    setIsRefreshing(true);
    try {
      const result = await refetch();
      console.log("Libraries refresh completed:", {
        success: !!result,
        libraryCount: result?.length || 0,
      });
    } catch (err) {
      console.error("Error refreshing libraries:", err);
      // Try a direct fetch as fallback if refetch fails
      try {
        console.log("Attempting direct fetch as fallback");
        const response = await fetch(`${API_BASE_URL}/api/libraries`);
        const data = await response.json();
        if (data && data.libraries) {
          console.log(
            "Direct fetch succeeded with",
            data.libraries.length,
            "libraries"
          );
        }
      } catch (fallbackErr) {
        console.error("Fallback fetch also failed:", fallbackErr);
      }
    } finally {
      setIsRefreshing(false);
      setLastRefreshTime(Date.now());
      initialFetchDone.current = true;
    }
  };

  // Add a ref to detect initial render vs page reload
  const isFirstRender = useRef(true);

  // Initial fetch when component mounts - with page reload detection
  useEffect(() => {
    // Always fetch on first visit to ensure data loads
    if (config.tautulliApiKey) {
      // This is more reliable for detecting when we need to load data
      const shouldFetch =
        !initialFetchDone.current || // Not fetched yet
        !libraries?.length || // No data available
        isFirstRender.current; // First render after navigation/reload

      if (shouldFetch) {
        console.log("Libraries - triggering data fetch on mount");
        // Small timeout to ensure component is fully mounted and React Query is ready
        setTimeout(() => {
          handleRefresh();
          isFirstRender.current = false;
        }, 300);
      }
    }

    // Return cleanup that forces refresh on next mount
    return () => {
      initialFetchDone.current = false;
    };
  }, [config.tautulliApiKey]);

  // Additional useEffect specifically for page reloads
  useEffect(() => {
    // Add event listener for page visibility changes (handles page reload)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Page became visible - checking if libraries need refresh");
        if (!libraries?.length) {
          console.log("No libraries data after visibility change - refreshing");
          handleRefresh();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Also handle focus events, which can occur on page reload
    window.addEventListener("focus", () => {
      console.log("Window focus event - checking library data");
      if (!libraries?.length) {
        handleRefresh();
      }
    });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", () => {});
    };
  }, [libraries]);

  // Setup auto-refresh interval
  useEffect(() => {
    if (config.tautulliApiKey) {
      // Setup interval for auto-refresh
      refreshInterval.current = setInterval(() => {
        handleRefresh();
      }, REFRESH_INTERVAL);

      // Cleanup interval on unmount
      return () => {
        if (refreshInterval.current) {
          clearInterval(refreshInterval.current);
        }
      };
    }
  }, [config.tautulliApiKey]);

  // Calculate time until next refresh
  const timeUntilNextRefresh = Math.max(
    0,
    REFRESH_INTERVAL - (Date.now() - lastRefreshTime)
  );
  const secondsUntilRefresh = Math.ceil(timeUntilNextRefresh / 1000);
  const minutesUntilRefresh = Math.floor(secondsUntilRefresh / 60);
  const formattedTimeUntilRefresh = `${minutesUntilRefresh}`;

  const handleSaveSections = async () => {
    if (selectedLibraries.size === 0) return;

    setIsSaving(true);
    const selectedData = libraries
      .filter((lib) => selectedLibraries.has(String(lib.raw_data.section_id)))
      .map((lib) => ({
        section_id: lib.raw_data.section_id,
        type: lib.raw_data.section_type || lib.raw_data.type,
        name: lib.raw_data.section_name || lib.raw_data.name,
      }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/sections`, {
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
              <Icons.Film size={14} className="text-accent-base" />
              <span className="text-theme-muted text-sm">
                {Array.isArray(libraries) ? libraries.length : 0} Libraries
              </span>
            </div>
            {isRefreshing ? (
              <span className="text-xs text-theme-muted">Refreshing...</span>
            ) : (
              <span className="text-xs text-theme-muted">
                Auto-refresh in {formattedTimeUntilRefresh}min
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {Array.isArray(libraries) && libraries.length > 0 && (
            <ThemedButton variant="ghost" onClick={() => toggleAll(libraries)}>
              {selectedLibraries.size === libraries.length
                ? "Deselect All"
                : "Select All"}
            </ThemedButton>
          )}
          <ThemedButton
            onClick={handleSaveSections}
            disabled={selectedLibraries.size === 0 || isSaving}
            variant="accent"
            icon={isSaving ? Icons.Loader2 : Icons.Save}
          >
            {isSaving ? "Saving..." : "Save Selection"}
          </ThemedButton>
          <ThemedButton
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="accent"
            icon={
              isRefreshing
                ? () => <Icons.RefreshCw className="animate-spin" />
                : Icons.RefreshCw
            }
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </ThemedButton>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-modal rounded-xl p-4 animate-pulse border border-gray-700/50"
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
        <ThemedCard className="text-center bg-red-500/10 border-red-500/20">
          <p className="text-red-400">
            Error loading libraries: {error.message}
          </p>
        </ThemedCard>
      ) : !libraries?.length ? (
        <ThemedCard className="text-center">
          <Icons.Film size={24} className="text-theme-muted mx-auto mb-3" />
          <p className="text-theme-muted">No libraries found</p>
        </ThemedCard>
      ) : (
        <div className="space-y-4">
          {libraries.map((library) => (
            <LibraryCard
              key={library.raw_data.section_id}
              library={library}
              isSelected={selectedLibraries.has(
                String(library.raw_data.section_id)
              )}
              onToggleSelect={toggleLibrary}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Libraries;
