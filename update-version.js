// update-version.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get environment (either from NODE_ENV or command-line args)
const isDev =
  process.env.NODE_ENV === "development" || process.argv.includes("--dev");
console.log(`Running in ${isDev ? "development" : "production"} mode`);

// Read the version from version.js (the source of truth)
function getVersionFromFile() {
  try {
    const versionFilePath = path.join(__dirname, "version.js");

    if (!fs.existsSync(versionFilePath)) {
      console.error("Error: version.js file does not exist!");
      process.exit(1);
    }

    const versionFileContent = fs.readFileSync(versionFilePath, "utf8");
    const versionMatch = versionFileContent.match(/appVersion = "([^"]+)"/);

    if (!versionMatch || !versionMatch[1]) {
      console.error("Error: Could not parse version from version.js!");
      process.exit(1);
    }

    // Extract the base version from the file
    const version = versionMatch[1];
    console.log(`Found version in version.js: ${version}`);
    return version;
  } catch (error) {
    console.error("Error reading version.js:", error);
    process.exit(1);
  }
}

// Update package.json with the version from version.js
function updatePackageJson(version) {
  try {
    const packageJsonPath = path.join(__dirname, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      console.error("Error: package.json file does not exist!");
      process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    // Set the version in package.json
    packageJson.version = version;

    // Write the updated package.json
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + "\n"
    );
    console.log(`Updated package.json with version: ${version}`);

    return true;
  } catch (error) {
    console.error("Error updating package.json:", error);
    return false;
  }
}

// Update README.md version badge
function updateReadmeBadge(version) {
  try {
    const readmePath = path.join(__dirname, "README.md");

    if (!fs.existsSync(readmePath)) {
      console.log("README.md file not found, skipping badge update");
      return true;
    }

    let readmeContent = fs.readFileSync(readmePath, "utf8");

    // Format version for the badge URL - convert hyphen to nothing
    // Example: 2.2.1-dev becomes 2.2.1dev for shield.io compatibility
    const badgeVersion = version.replace(/-/g, "");
    console.log(`Using formatted version for badge: ${badgeVersion}`);

    // Update the version badge
    // This regex matches the version badge in your README.md with a more flexible pattern
    const badgeRegex =
      /<img src="https:\/\/img\.shields\.io\/badge\/version-[^"]+-blue\?style=for-the-badge" alt="Version" \/>/;

    if (badgeRegex.test(readmeContent)) {
      readmeContent = readmeContent.replace(
        badgeRegex,
        `<img src="https://img.shields.io/badge/version-${badgeVersion}-blue?style=for-the-badge" alt="Version" />`
      );

      fs.writeFileSync(readmePath, readmeContent);
      console.log(`Updated README.md badge with version: ${badgeVersion}`);
      return true;
    } else {
      console.log(
        "Version badge not found in README.md, skipping badge update"
      );
      return true;
    }
  } catch (error) {
    console.error("Error updating README.md badge:", error);
    return false;
  }
}

// Main function
function main() {
  const version = getVersionFromFile();

  if (!version) {
    console.error("Failed to get version information.");
    process.exit(1);
  }

  const packageSuccess = updatePackageJson(version);
  const readmeSuccess = updateReadmeBadge(version);

  if (packageSuccess && readmeSuccess) {
    console.log("Version update completed successfully!");
  } else {
    console.error("Version update failed!");
    process.exit(1);
  }
}

// Execute the main function
main();
