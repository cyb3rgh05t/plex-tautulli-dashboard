import { logError, logInfo } from "./logger";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

/**
 * Safely prefetch data with proper error handling and improved caching
 * @param {Object} queryClient - React Query client instance
 * @param {String} queryKey - The key to use for the query
 * @param {Function} queryFn - The function to fetch the data
 * @param {Object} options - Additional options for the query (staleTime, cacheTime, etc.)
 */
export const safePrefetch = async (
  queryClient,
  queryKey,
  queryFn,
  options = {}
) => {
  if (!queryFn) {
    logError(`Missing queryFn for ${queryKey}`);
    return null;
  }

  // Default options with longer staleTime and cacheTime
  const defaultOptions = {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
  };

  try {
    logInfo(`Prefetching data for ${queryKey}`);
    return await queryClient.prefetchQuery([queryKey], queryFn, defaultOptions);
  } catch (error) {
    logError(`Error prefetching ${queryKey}:`, error);
    return null;
  }
};

/**
 * Enhanced prefetch for sections - with more aggressive caching
 */
export const prefetchSections = async (queryClient) => {
  return safePrefetch(
    queryClient,
    "sections",
    async () => {
      const response = await fetch(`/api/sections`);
      if (!response.ok) {
        throw new Error("Failed to fetch sections");
      }
      return response.json();
    },
    {
      staleTime: 30 * 60 * 1000, // 30 minutes - sections change rarely
    }
  );
};

/**
 * Prefetch recently added media with optimized batch loading
 * Now prefetches section data first, then media for those sections in parallel
 */
export const prefetchRecentlyAdded = async (queryClient) => {
  try {
    // First, prefetch sections with longer cache time
    const sectionsData = await prefetchSections(queryClient);

    if (!sectionsData || !sectionsData.sections) {
      logInfo("No sections data available for prefetching media");
      return false;
    }

    // Get all section IDs, grouped by media type
    const mediaTypes = [
      { type: "movies", sections: [] },
      { type: "shows", sections: [] },
      { type: "music", sections: [] },
    ];

    // Group sections by type
    sectionsData.sections.forEach((section) => {
      const sectionType =
        section.raw_data?.type?.toLowerCase() ||
        section.raw_data?.section_type?.toLowerCase();

      if (sectionType === "movie") {
        mediaTypes[0].sections.push(section.raw_data.section_id);
      } else if (sectionType === "show") {
        mediaTypes[1].sections.push(section.raw_data.section_id);
      } else if (sectionType === "artist") {
        mediaTypes[2].sections.push(section.raw_data.section_id);
      }
    });

    // Prefetch for each media type in parallel
    await Promise.all(
      mediaTypes.map(async ({ type, sections }) => {
        if (sections.length === 0) return null;

        // Prefetch media type data
        return safePrefetch(
          queryClient,
          `recentlyAdded:${type}`,
          async () => {
            const response = await fetch(`/api/recent/${type}?count=20`);
            if (!response.ok) {
              throw new Error(`Failed to fetch recently added ${type}`);
            }
            return response.json();
          },
          { staleTime: 5 * 60 * 1000 } // 5 minutes
        );
      })
    );

    logInfo("Successfully prefetched recently added media");
    return true;
  } catch (error) {
    logError("Error prefetching recently added media:", error);
    return false;
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
 * Improved dashboard prefetch - now more efficient with parallel fetching
 */
export const prefetchDashboardData = async (queryClient) => {
  try {
    // Prefetch all main data types in parallel with different priorities
    const results = await Promise.allSettled([
      prefetchSections(queryClient),
      prefetchRecentlyAdded(queryClient),
      prefetchActivities(queryClient),
      prefetchLibraries(queryClient),
    ]);

    // Log success rate
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    logInfo(`Dashboard prefetch: ${successCount}/${results.length} successful`);

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
  prefetchSections,
};
