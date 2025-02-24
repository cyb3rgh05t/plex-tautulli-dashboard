const fs = require("fs");
const path = require("path");

// Define the formats file in the configs folder in root directory
const FORMATS_FILE = path.join(process.cwd(), "configs", "formats.json");

// Initialize formats file if it doesn't exist
const ensureFormatsFileExists = () => {
  const configDir = path.dirname(FORMATS_FILE);

  // Create configs directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    try {
      fs.mkdirSync(configDir, { recursive: true });
      console.log(`Created configs directory at: ${configDir}`);
    } catch (error) {
      console.error("Failed to create configs directory:", error);
    }
  }

  if (!fs.existsSync(FORMATS_FILE)) {
    try {
      // Create default format structure
      const defaultFormats = {
        downloads: [],
        recentlyAdded: [],
        users: [],
      };

      fs.writeFileSync(FORMATS_FILE, JSON.stringify(defaultFormats, null, 2));
      console.log(`Created formats file at: ${FORMATS_FILE}`);
    } catch (error) {
      console.error("Failed to create formats file:", error);
    }
  }
};

// Ensure formats file exists on load
ensureFormatsFileExists();

const getFormats = () => {
  try {
    const data = fs.readFileSync(FORMATS_FILE, "utf8");
    const formats = JSON.parse(data);
    // Ensure all required arrays exist
    return {
      downloads: formats.downloads || [],
      recentlyAdded: formats.recentlyAdded || [],
      users: formats.users || [], // Add users array
      sections: formats.sections || [], // Add sections array
    };
  } catch (error) {
    console.error("Error reading formats:", error);
    return {
      downloads: [],
      recentlyAdded: [],
      users: [],
      sections: [],
    };
  }
};

const saveFormats = (formats) => {
  try {
    // Ensure we have all required keys
    const updatedFormats = {
      downloads: formats.downloads || [],
      recentlyAdded: formats.recentlyAdded || [],
      users: formats.users || [],
      sections: formats.sections || [],
    };

    fs.writeFileSync(FORMATS_FILE, JSON.stringify(updatedFormats, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving formats:", error);
    return false;
  }
};

const getSections = () => {
  const formats = getFormats();
  return {
    total: formats.sections.length,
    sections: formats.sections,
  };
};

const saveSections = (sections) => {
  try {
    const formats = getFormats();
    formats.sections = sections;
    saveFormats(formats);
    return {
      total: sections.length,
      sections: sections,
    };
  } catch (error) {
    console.error("Error saving sections:", error);
    throw new Error("Failed to save sections");
  }
};

module.exports = {
  getFormats,
  saveFormats,
  getSections,
  saveSections,
};
