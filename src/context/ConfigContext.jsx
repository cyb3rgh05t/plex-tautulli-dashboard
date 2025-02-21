import React, { createContext, useState, useContext, useEffect } from "react";
import { logInfo } from "../utils/logger";

const ConfigContext = createContext(null);

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(() => {
    const savedConfig = localStorage.getItem("plexTautulliConfig");
    return savedConfig ? JSON.parse(savedConfig) : null;
  });

  const updateConfig = (newConfig) => {
    // Create a new config object that merges existing config with new config
    const updatedConfig = {
      ...config,
      plexUrl: newConfig.plexUrl,
      plexToken: newConfig.plexToken,
      tautulliUrl: newConfig.tautulliUrl,
      tautulliApiKey: newConfig.tautulliApiKey,
    };

    // Set the new config in local storage
    localStorage.setItem("plexTautulliConfig", JSON.stringify(updatedConfig));

    // Update the state
    setConfig(updatedConfig);

    // Log the update (optional)
    logInfo("Configuration updated", {
      config: {
        plexUrl: updatedConfig.plexUrl,
        tautulliUrl: updatedConfig.tautulliUrl,
        hasPlexToken: !!updatedConfig.plexToken,
        hasTautulliKey: !!updatedConfig.tautulliApiKey,
      },
    });
  };

  const isConfigured = () => {
    return !!(
      config &&
      config.plexUrl &&
      config.plexToken &&
      config.tautulliUrl &&
      config.tautulliApiKey
    );
  };

  // Clear configuration (useful for testing)
  const clearConfig = () => {
    localStorage.removeItem("plexTautulliConfig");
    setConfig(null);
  };

  return (
    <ConfigContext.Provider
      value={{ config, updateConfig, isConfigured, clearConfig }}
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
