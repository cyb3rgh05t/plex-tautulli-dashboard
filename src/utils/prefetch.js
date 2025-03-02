import { logError } from "./logger";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

/**
 * Safely prefetch data with proper error handling
 * @param {Object} queryClient - React Query client instance
 * @param {String} queryKey - The key to use for the query
 * @param {Function} queryFn - The function to fetch the data
 */
export const safePrefetch = async (queryClient, queryKey, queryFn) => {
  if (!queryFn) {
    console.error(`Missing queryFn for ${queryKey}`);
    return null;
  }

  try {
    return await queryClient.prefetchQuery([queryKey], queryFn);
  } catch (error) {
    logError(`Error prefetching ${queryKey}:`, error);
    return null;
  }
};

/**
 * Prefetch activities data
 */
export const prefetchActivities = (queryClient) => {
  return safePrefetch(queryClient, "plexActivities", async () => {
    const response = await fetch(`/api/downloads`);
    if (!response.ok) {
      throw new Error("Failed to fetch activities");
    }
    const data = await response.json();
    return data.activities || [];
  });
};

/**
 * Prefetch recently added media
 */
export const prefetchRecentlyAdded = (queryClient) => {
  return safePrefetch(queryClient, "recentlyAdded", async () => {
    const response = await fetch(`/api/recent/movies`);
    if (!response.ok) {
      throw new Error("Failed to fetch recently added");
    }
    return await response.json();
  });
};

/**
 * Prefetch libraries data
 */
export const prefetchLibraries = (queryClient) => {
  return safePrefetch(queryClient, "libraries", async () => {
    const response = await fetch(`/api/libraries`);
    if (!response.ok) {
      throw new Error("Failed to fetch libraries");
    }
    return await response.json();
  });
};

/**
 * Prefetch users data
 */
export const prefetchUsers = (queryClient) => {
  return safePrefetch(queryClient, "users", async () => {
    const response = await fetch(`/api/users`);
    if (!response.ok) {
      throw new Error("Failed to fetch users");
    }
    const data = await response.json();
    return data.users || [];
  });
};

/**
 * Prefetch all dashboard data
 */
export const prefetchDashboardData = async (queryClient) => {
  try {
    await Promise.all([
      prefetchActivities(queryClient),
      prefetchRecentlyAdded(queryClient),
      prefetchLibraries(queryClient),
    ]);
    return true;
  } catch (error) {
    logError("Error prefetching dashboard data:", error);
    return false;
  }
};

/**
 * Prefetch data for a specific route
 */
export const prefetchRouteData = (queryClient, route) => {
  switch (route) {
    case "/activities":
      return prefetchActivities(queryClient);
    case "/recent":
      return prefetchRecentlyAdded(queryClient);
    case "/libraries":
      return prefetchLibraries(queryClient);
    case "/users":
      return prefetchUsers(queryClient);
    default:
      return Promise.resolve();
  }
};

export default {
  safePrefetch,
  prefetchActivities,
  prefetchRecentlyAdded,
  prefetchLibraries,
  prefetchUsers,
  prefetchDashboardData,
  prefetchRouteData,
};
