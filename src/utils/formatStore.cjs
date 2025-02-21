const fs = require("fs");
const path = require("path");

const FORMATS_FILE = path.join(__dirname, "/configs/formats.json");

// Initialize formats file if it doesn't exist
if (!fs.existsSync(FORMATS_FILE)) {
  fs.writeFileSync(
    FORMATS_FILE,
    JSON.stringify({
      downloads: [],
      recentlyAdded: [],
      users: [],
    })
  );
}

const getFormats = () => {
  try {
    const data = fs.readFileSync(FORMATS_FILE, "utf8");
    const formats = JSON.parse(data);
    // Ensure all required arrays exist
    return {
      downloads: formats.downloads || [],
      recentlyAdded: formats.recentlyAdded || [],
      users: formats.users || [], // Add users array
    };
  } catch (error) {
    console.error("Error reading formats:", error);
    return {
      downloads: [],
      recentlyAdded: [],
      users: [], // Add users array
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
