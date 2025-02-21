const fs = require("fs");
const path = require("path");

// Determine the correct path for the config file
const CONFIG_FILE = path.join(__dirname, "config.json");

// Initialize config with default values
let config = {
  plexUrl: null,
  plexToken: null,
  tautulliUrl: null,
  tautulliApiKey: null,
};

// Ensure the config directory exists
const ensureConfigDirectoryExists = () => {
  const configDir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(configDir)) {
    try {
      fs.mkdirSync(configDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create config directory:", error);
    }
  }
};

// Load config from file if it exists
const loadConfig = () => {
  try {
    // Ensure directory exists
    ensureConfigDirectoryExists();

    // Check if file exists
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

      console.log("Configuration loaded:", {
        plexUrl: config.plexUrl ? "[REDACTED]" : "Not set",
        tautulliUrl: config.tautulliUrl ? "[REDACTED]" : "Not set",
        hasPlexToken: !!config.plexToken,
        hasTautulliKey: !!config.tautulliApiKey,
      });
    } else {
      console.log("No existing configuration found. Using default.");
      // Create an empty config file if it doesn't exist
      saveConfig();
    }
  } catch (error) {
    console.error("Error loading configuration:", error);
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
    // Ensure directory exists
    ensureConfigDirectoryExists();

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

    console.log("Configuration saved:", {
      plexUrl: configToSave.plexUrl ? "[REDACTED]" : "Not set",
      tautulliUrl: configToSave.tautulliUrl ? "[REDACTED]" : "Not set",
      hasPlexToken: !!configToSave.plexToken,
      hasTautulliKey: !!configToSave.tautulliApiKey,
    });
  } catch (error) {
    console.error("Error saving configuration:", error);
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
    console.error("Error updating configuration:", error);
    throw error;
  }
};

// Load initial configuration
loadConfig();

module.exports = {
  setConfig,
  getConfig: () => config,
  loadConfig,
  saveConfig,
};
