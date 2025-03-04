// update-version.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the current version from version.js
function getCurrentVersion() {
  try {
    // Read the existing version.js file
    const versionFilePath = path.join(__dirname, "version.js");
    if (fs.existsSync(versionFilePath)) {
      const versionFileContent = fs.readFileSync(versionFilePath, "utf8");
      // Extract the version using regex
      const versionMatch = versionFileContent.match(/appVersion = "([^"]+)"/);
      if (versionMatch && versionMatch[1]) {
        console.log(`Found version in version.js: ${versionMatch[1]}`);
        return versionMatch[1];
      }
    }

    // If we couldn't find or parse the version.js file
    console.error("Could not find or parse version from version.js");
    process.exit(1); // Exit with error code
  } catch (error) {
    console.error("Error reading version.js:", error);
    process.exit(1); // Exit with error code
  }
}

// Get current version
const currentVersion = getCurrentVersion();
const isDev = process.env.NODE_ENV === "development";

// Set version string based on environment
const version = isDev ? `${currentVersion}-dev` : currentVersion;

// Get the current date for the build date
const buildDate = new Date().toISOString();

// Update the package.json with the version from version.js
try {
  const packageJsonPath = path.join(__dirname, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  // Set the version in package.json to the base version from version.js
  packageJson.version = currentVersion;

  // Write the updated package.json
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n"
  );
  console.log(`Updated package.json with version: ${currentVersion}`);
} catch (error) {
  console.error("Error updating package.json:", error);
}

// Update version.js to include any dev suffix and build date
// But preserve the original version number for future manual updates
const versionContent = `// Auto-generated version file - Update version here for new releases
export const appVersion = "${version}";
export const buildDate = "${buildDate}";
export const isDevelopment = ${isDev};
`;

// Write the updated version.js file
fs.writeFileSync(path.join(__dirname, "version.js"), versionContent);

console.log(
  `Updated version.js with version: ${version}, build date: ${buildDate}, isDevelopment: ${isDev}`
);
