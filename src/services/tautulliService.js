import axios from "axios";
import { logError, logInfo } from "../utils/logger";

const PROXY_BASE_URL = "http://localhost:3006";

const tautulliAxios = axios.create({
  baseURL: `${PROXY_BASE_URL}/api/tautulli`,
  timeout: 30000, // Increased from 10000 to 30000ms (30 seconds)
  timeoutErrorMessage: "Connection to Tautulli server timed out",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export const testTautulliConnection = async (tautulliUrl, apiKey) => {
  try {
    // Configure the proxy first
    await axios.post(`${PROXY_BASE_URL}/api/config`, {
      tautulliUrl,
    });

    try {
      const response = await tautulliAxios.get("/api/v2", {
        params: {
          apikey: apiKey,
          cmd: "get_server_info",
        },
        timeout: 30000, // Specific timeout for this request
      });

      if (!response.data?.response?.result === "success") {
        throw new Error("Invalid response from Tautulli server");
      }

      logInfo("Tautulli connection successful");
      return response.data?.response?.data;
    } catch (connectionError) {
      // More specific error handling
      if (connectionError.code === "ECONNABORTED") {
        throw new Error(
          `Tautulli connection timed out. Please check your server URL and network connection.`
        );
      }
      throw connectionError;
    }
  } catch (error) {
    logError("Tautulli connection failed", error);

    // More detailed error handling
    if (error.response?.status === 401) {
      throw new Error("Invalid Tautulli API key");
    }

    throw new Error(
      error.message ||
        "Failed to connect to Tautulli server. Please check your server URL and API key."
    );
  }
};

export const getImageUrl = (imagePath, apiKey) => {
  if (!imagePath) return null;
  return `${PROXY_BASE_URL}/api/tautulli/pms_image_proxy?img=${encodeURIComponent(
    imagePath
  )}&apikey=${apiKey}`;
};

export const configureProxy = async (plexUrl, tautulliUrl) => {
  try {
    await axios.post(`${PROXY_BASE_URL}/api/config`, {
      plexUrl,
      tautulliUrl,
    });
    logInfo("Proxy configuration updated");
  } catch (error) {
    logError("Failed to configure proxy", error);
    throw new Error("Failed to configure proxy server");
  }
};

export const fetchRecentlyAdded = async (apiKey) => {
  try {
    const response = await tautulliAxios.get("/api/v2", {
      params: {
        apikey: apiKey,
        cmd: "get_recently_added",
        count: 50,
      },
    });

    if (!response.data?.response?.result === "success") {
      throw new Error("Invalid response from Tautulli server");
    }

    const recentlyAdded = response.data?.response?.data?.recently_added || [];
    logInfo("Fetched Tautulli recently added", { count: recentlyAdded.length });

    return recentlyAdded.map((item) => ({
      id: item.rating_key,
      title: item.title,
      mediaType: item.media_type,
      addedAt: item.added_at,
      summary: item.summary,
      thumb: getImageUrl(item.thumb, apiKey),
      year: item.year,
      rating: item.rating,
      duration: item.duration,
      contentRating: item.content_rating,
    }));
  } catch (error) {
    logError("Failed to fetch recently added media", error);
    throw new Error("Failed to fetch recently added media");
  }
};
