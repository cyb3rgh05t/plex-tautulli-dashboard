import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logError, logInfo, logDebug } from "./logger.js";

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine the correct path for the config file in the configs folder in root directory
const CONFIG_FILE = path.join(process.cwd(), "configs", "config.json");

// Initialize config with default values
let config = {
  plexUrl: null,
  plexToken: null,
  tautulliUrl: null,
  tautulliApiKey: null,
};

// Ensure the config directory and file exists
const ensureConfigFileExists = () => {
  const configDir = path.dirname(CONFIG_FILE);

  // Create configs directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    try {
      fs.mkdirSync(configDir, { recursive: true });
      logInfo(`Created configs directory at: ${configDir}`);
    } catch (error) {
      logError("Failed to create configs directory:", error);
    }
  }

  // Create the file with default settings if it doesn't exist
  if (!fs.existsSync(CONFIG_FILE)) {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
      logInfo(`Created config file at: ${CONFIG_FILE}`);
    } catch (error) {
      logError("Failed to create config file:", error);
    }
  }
};

// Load config from file if it exists
const loadConfig = () => {
  try {
    // Ensure file exists
    ensureConfigFileExists();

    // Read and parse the config file
    if (fs.existsSync(CONFIG_FILE)) {
      const rawData = fs.readFileSync(CONFIG_FILE, "utf8");
      const loadedConfig = JSON.parse(rawData);

      // Merge loaded config with default config structure
      config = {
        plexUrl: loadedConfig.plexUrl || null,
        plexToken: loadedConfig.plexToken || null,
        tautulliUrl: loadedConfig.tautulliUrl || null,
        tautulliApiKey: loadedConfig.tautulliApiKey || null,
      };

      logInfo("Configuration loaded:", {
        plexUrl: config.plexUrl ? "[REDACTED]" : "Not set",
        tautulliUrl: config.tautulliUrl ? "[REDACTED]" : "Not set",
        hasPlexToken: !!config.plexToken,
        hasTautulliKey: !!config.tautulliApiKey,
      });
    } else {
      logInfo("No existing configuration found. Using default.");
      // Create an empty config file if it doesn't exist
      saveConfig();
    }
  } catch (error) {
    logError("Error loading configuration:", error);
    // Fallback to default config
    config = {
      plexUrl: null,
      plexToken: null,
      tautulliUrl: null,
      tautulliApiKey: null,
    };
  }
};

// Save configuration to file
const saveConfig = () => {
  try {
    // Prepare config for saving (avoid saving null values)
    const configToSave = {
      plexUrl: config.plexUrl || null,
      plexToken: config.plexToken || null,
      tautulliUrl: config.tautulliUrl || null,
      tautulliApiKey: config.tautulliApiKey || null,
    };

    // Write file with full error handling
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2), {
      encoding: "utf8",
      flag: "w", // overwrite
    });

    logInfo("Configuration saved:", {
      plexUrl: configToSave.plexUrl ? "[REDACTED]" : "Not set",
      tautulliUrl: configToSave.tautulliUrl ? "[REDACTED]" : "Not set",
      hasPlexToken: !!configToSave.plexToken,
      hasTautulliKey: !!configToSave.tautulliApiKey,
    });
  } catch (error) {
    logError("Error saving configuration:", error);
    throw error; // Rethrow to allow caller to handle
  }
};

// Set configuration method
const setConfig = (newConfig) => {
  try {
    // Update config with new values, preserving existing values if not provided
    config = {
      plexUrl: newConfig.plexUrl || config.plexUrl,
      plexToken: newConfig.plexToken || config.plexToken,
      tautulliUrl: newConfig.tautulliUrl || config.tautulliUrl,
      tautulliApiKey: newConfig.tautulliApiKey || config.tautulliApiKey,
    };

    // Save the updated configuration
    saveConfig();
  } catch (error) {
    logError("Error updating configuration:", error);
    throw error;
  }
};

// Define getConfig function separately
const getConfig = () => config;

// Load initial configuration
loadConfig();

// Export all functions
export { setConfig, getConfig, loadConfig, saveConfig };
