import { useState, useEffect } from "react";
import { useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useConfig } from "../context/ConfigContext";
import { prefetchDashboardData, prefetchRouteData } from "../utils/prefetch";
import { logError } from "../utils/logger";

/**
 * Custom hook for preloading data
 */
export const usePreload = () => {
  const { config, isConfigured } = useConfig();
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadComplete, setPreloadComplete] = useState(false);
  const [preloadError, setPreloadError] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  /**
   * Preload all dashboard data
   */
  const preloadDashboard = async () => {
    if (!isConfigured()) {
      setPreloadError("Cannot preload without valid configuration");
      return false;
    }

    try {
      setIsPreloading(true);
      setPreloadError(null);

      const result = await prefetchDashboardData(queryClient, config);

      setPreloadComplete(result.success);

      if (!result.success) {
        setPreloadError(result.error);
      }

      return result.success;
    } catch (error) {
      logError("Error preloading dashboard data", error);
      setPreloadError(error.message || "Failed to preload dashboard data");
      return false;
    } finally {
      setIsPreloading(false);
    }
  };

  /**
   * Preload data for a specific route and navigate to it
   */
  const preloadAndNavigate = async (route) => {
    if (!isConfigured()) {
      navigate("/setup");
      return;
    }

    try {
      setIsPreloading(true);

      await prefetchRouteData(queryClient, route, config);

      navigate(route);
    } catch (error) {
      logError(`Error preloading route ${route}`, error);
      // Still navigate even if preloading fails
      navigate(route);
    } finally {
      setIsPreloading(false);
    }
  };

  return {
    preloadDashboard,
    preloadAndNavigate,
    isPreloading,
    preloadComplete,
    preloadError,
  };
};

export default usePreload;
