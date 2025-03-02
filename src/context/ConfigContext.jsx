import React, { createContext, useState, useContext, useEffect } from "react";
import { logInfo, logError } from "../utils/logger";
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

const ConfigContext = createContext(null);

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [configError, setConfigError] = useState(null);

  // Check if there's a valid configuration on the server
  const checkExistingConfig = async () => {
    try {
      setIsLoading(true);
      setConfigError(null);

      const response = await axios.get(`/api/config`);

      const configData = response.data;

      // Check if all required config values are present and non-null
      if (
        configData.plexUrl &&
        configData.plexToken &&
        configData.tautulliUrl &&
        configData.tautulliApiKey
      ) {
        setConfig(configData);
        logInfo("Existing configuration loaded successfully");
      } else {
        setConfig(null);
        logInfo("No complete configuration found");
      }
    } catch (error) {
      logError("Error checking configuration:", error);
      setConfigError(error.message || "Failed to check configuration");
      setConfig(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify the loaded configuration by testing the connections
  const verifyConfig = async (configData) => {
    try {
      // TODO: Add actual verification logic if needed
      return true;
    } catch (error) {
      logError("Configuration verification failed:", error);
      return false;
    }
  };

  // Load configuration on component mount
  useEffect(() => {
    checkExistingConfig();
  }, []);

  // Update the configuration on the server
  const updateConfig = async (newConfig) => {
    try {
      setIsLoading(true);

      const response = await axios.post(`/api/config`, newConfig);

      if (!response.data || response.data.status !== "ok") {
        throw new Error("Failed to update configuration");
      }

      // Use the response data to avoid any synchronization issues
      const serverConfig = {
        plexUrl: newConfig.plexUrl,
        plexToken: newConfig.plexToken,
        tautulliUrl: newConfig.tautulliUrl,
        tautulliApiKey: newConfig.tautulliApiKey,
      };

      setConfig(serverConfig);

      logInfo("Configuration updated successfully");

      return serverConfig;
    } catch (error) {
      logError("Error updating configuration:", error);
      setConfigError(error.message || "Failed to update configuration");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Check if the application is configured
  const isConfigured = () => {
    return !!(
      config &&
      config.plexUrl &&
      config.plexToken &&
      config.tautulliUrl &&
      config.tautulliApiKey
    );
  };

  // Clear all configuration (reset)
  const clearConfig = async () => {
    try {
      setIsLoading(true);

      const response = await axios.post(`/api/reset-all`);

      if (!response.data || response.data.status !== "success") {
        throw new Error("Failed to reset configuration");
      }

      setConfig(null);
      logInfo("Configuration cleared successfully");
    } catch (error) {
      logError("Error clearing configuration:", error);
      setConfigError(error.message || "Failed to clear configuration");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh the configuration from the server
  const refreshConfig = () => {
    return checkExistingConfig();
  };

  return (
    <ConfigContext.Provider
      value={{
        config,
        updateConfig,
        isConfigured,
        clearConfig,
        refreshConfig,
        isLoading,
        configError,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);

  if (!context) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }

  return context;
};

export default ConfigContext;
