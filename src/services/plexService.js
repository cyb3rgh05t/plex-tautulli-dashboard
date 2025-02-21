import axios from "axios";
import { logError, logInfo } from "../utils/logger";

const PROXY_BASE_URL = "http://localhost:3006";

const plexAxios = axios.create({
  baseURL: `${PROXY_BASE_URL}/api/plex`,
  timeout: 30000, // Increased from 10000 to 30000ms (30 seconds)
  timeoutErrorMessage: "Connection to Plex server timed out",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export const testPlexConnection = async (plexUrl, plexToken) => {
  try {
    logInfo("Testing Plex connection...", { url: plexUrl });

    // Configure the proxy with both URL and token
    await axios.post(`${PROXY_BASE_URL}/api/config`, {
      plexUrl,
      plexToken,
    });

    // Test connection with more detailed error handling
    try {
      const response = await plexAxios.get("/identity", {
        params: {
          "X-Plex-Token": plexToken,
        },
        timeout: 30000, // Specific timeout for this request
      });

      if (!response.data?.MediaContainer) {
        throw new Error("Invalid response from Plex server");
      }

      logInfo("Plex connection successful", {
        serverName: response.data.MediaContainer.friendlyName,
      });

      return response.data;
    } catch (connectionError) {
      // More specific error handling
      if (connectionError.code === "ECONNABORTED") {
        throw new Error(
          `Plex connection timed out. Please check your server URL and network connection.`
        );
      }
      throw connectionError;
    }
  } catch (error) {
    logError("Plex connection failed", error);

    if (error.response?.status === 401) {
      throw new Error("Invalid Plex token");
    }

    if (error.code === "ECONNREFUSED") {
      throw new Error(
        "Unable to connect to Plex server. Please check if the server is running."
      );
    }

    throw new Error(
      error.message ||
        "Failed to connect to Plex server. Please check your server URL and token."
    );
  }
};

export const fetchPlexActivities = async (plexToken) => {
  try {
    if (!plexToken) {
      throw new Error("Plex token is required");
    }

    const response = await plexAxios.get("/activities", {
      params: {
        "X-Plex-Token": plexToken,
      },
    });

    if (!response.data?.MediaContainer) {
      throw new Error("Invalid response from Plex server");
    }

    const activities = response.data.MediaContainer.Activity || [];

    logInfo("Fetched Plex activities", {
      count: activities.length,
    });

    return activities.map((activity) => ({
      uuid: activity.uuid,
      type: activity.type,
      title: activity.title,
      subtitle: activity.subtitle,
      progress:
        typeof activity.progress === "number"
          ? Math.min(activity.progress, 100)
          : 0,
    }));
  } catch (error) {
    logError("Failed to fetch Plex activities", error);
    throw new Error(
      error.response?.data?.error || "Failed to fetch Plex activities"
    );
  }
};
