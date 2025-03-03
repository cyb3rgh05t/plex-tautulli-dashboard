// update-version.js
const fs = require("fs");
const path = require("path");

// Get the base version from the existing version.js file
function getBaseVersion() {
  try {
    // Read the existing version.js file
    const versionFilePath = path.join(__dirname, "version.js");
    if (fs.existsSync(versionFilePath)) {
      const versionFileContent = fs.readFileSync(versionFilePath, "utf8");
      // Extract the version using regex
      const versionMatch = versionFileContent.match(/appVersion = "([^"]+)"/);
      if (versionMatch && versionMatch[1]) {
        // Remove any development suffix if it exists
        return versionMatch[1].replace(/-dev\.\d+$/, "");
      }
    }

    // If we got here, we couldn't find or parse the version from version.js
    console.error("Could not find or parse version from version.js");

    // Try to read version from package.json as a backup
    const packageJsonPath = path.join(__dirname, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      if (packageJson.version) {
        console.log(`Using version from package.json: ${packageJson.version}`);
        return packageJson.version;
      }
    }

    // If we still don't have a version, throw an error
    throw new Error("Could not determine version");
  } catch (error) {
    console.error("Error determining version:", error);
    process.exit(1); // Exit with error code
  }
}

// Define the build time & version
const buildDate = new Date().toISOString();
const isDev = process.env.NODE_ENV === "development";
const baseVersion = getBaseVersion();
const version = generateVersionString(baseVersion, isDev);

// Generate appropriate version string
function generateVersionString(baseVersion, isDev) {
  // For development builds, add dev identifier and timestamp
  if (isDev) {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\..+/, "");
    return `${baseVersion}-dev`;
  }

  // For production builds, use the base version
  return baseVersion;
}

// Create the version file content
const versionContent = `// Auto-generated version file - Do not modify manually
export const appVersion = "${version}";
export const buildDate = "${buildDate}";
export const isDevelopment = ${isDev};
`;

// Write the version information to the version.js file
fs.writeFileSync(path.join(__dirname, "version.js"), versionContent);

// Update the version in package.json
try {
  const packageJsonPath = path.join(__dirname, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  // For package.json, always use the base version (without dev suffix)
  packageJson.version = baseVersion;

  // Write the updated package.json
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n"
  );
  console.log(`Updated package.json with version: ${baseVersion}`);
} catch (error) {
  console.error("Error updating package.json:", error);
}

console.log(
  `Updated version.js with version: ${version}, build date: ${buildDate}, isDevelopment: ${isDev}`
);
