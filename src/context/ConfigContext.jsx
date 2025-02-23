import React, { createContext, useState, useContext, useEffect } from "react";
import { logInfo } from "../utils/logger";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

const ConfigContext = createContext(null);

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(false); // Force re-render

  const checkExistingConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/config`);

      if (!response.ok) {
        throw new Error("Failed to fetch configuration");
      }

      const configData = await response.json();

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
      }
    } catch (error) {
      console.error("Error checking configuration:", error);
      setConfig(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkExistingConfig();
  }, []);

  const updateConfig = async (newConfig) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error("Failed to update configuration");
      }

      const updatedConfig = await response.json();
      setConfig(updatedConfig.config);
      setForceUpdate((prev) => !prev); // Force re-render

      logInfo("Configuration updated successfully");
    } catch (error) {
      console.error("Error updating configuration:", error);
      throw error;
    }
  };

  const isConfigured = () => !!config;

  // Clear configuration
  const clearConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reset-all`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to reset configuration");
      }

      localStorage.removeItem("plexTautulliConfig");
      setConfig(null);
      logInfo("Configuration cleared successfully");
    } catch (error) {
      console.error("Error clearing configuration:", error);
      throw error;
    }
  };

  return (
    <ConfigContext.Provider
      value={{
        config,
        updateConfig,
        isConfigured,
        clearConfig,
        isLoading,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
export default ConfigContext;
