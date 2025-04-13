/**
 * Extract version-specific release notes from CHANGELOG.md
 *
 * This script extracts release notes for a specific version from the CHANGELOG.md file.
 * If no version is specified, it uses the version from package.json.
 * If the version has a "-dev" suffix, it's removed before searching.
 * If the version isn't found, a generic message is written to the output file.
 *
 * Usage: node extract-changelog.js [version]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

// Create require function for importing JSON
const require = createRequire(import.meta.url);

// Get current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find project root (go up until we find package.json)
let projectRoot = __dirname;
while (
  !fs.existsSync(path.join(projectRoot, "package.json")) &&
  projectRoot !== path.dirname(projectRoot)
) {
  projectRoot = path.dirname(projectRoot);
}

// Get version from command line or package.json
let version = process.argv[2];

if (!version) {
  try {
    // Get version from package.json
    const packageJsonPath = path.join(projectRoot, "package.json");
    const packageJson = require(packageJsonPath);
    version = packageJson.version;
    console.log(`Using version from package.json: ${version}`);
  } catch (error) {
    console.error(`Error reading package.json: ${error.message}`);
    process.exit(1);
  }
}

// Remove "-dev" suffix if present
const cleanVersion = version.replace(/-dev$/, "");
if (cleanVersion !== version) {
  console.log(`Removed "-dev" suffix: ${cleanVersion}`);
  version = cleanVersion;
}

// Changelog path
const changelogPath = path.join(projectRoot, "CHANGELOG.md");

/**
 * Extracts release notes for the specified version
 * @param {string} version - Version to extract notes for
 * @returns {string|null} - Extracted release notes or null if not found
 */
function extractReleaseNotes(version) {
  try {
    // Check if file exists
    if (!fs.existsSync(changelogPath)) {
      console.error("Changelog file not found");
      return null;
    }

    // Read the file
    const content = fs.readFileSync(changelogPath, "utf8");

    // Find the version header line
    const versionHeader = `## [${version}]`;
    const startIndex = content.indexOf(versionHeader);

    if (startIndex === -1) {
      console.error(`Version ${version} not found in changelog`);
      return null;
    }

    // Find the start of the version header line
    // (go backward to find the beginning of the line containing the version)
    let headerLineStart = startIndex;
    while (headerLineStart > 0 && content[headerLineStart - 1] !== "\n") {
      headerLineStart--;
    }

    // Find the next version header or end of file
    const nextVersionMatch = content
      .substring(startIndex)
      .match(/\n## \[\d+\.\d+\.\d+\]/);
    const endIndex = nextVersionMatch
      ? startIndex + nextVersionMatch.index
      : content.length;

    // Extract the text including the header line up to the next version
    const releaseNotes = content.substring(headerLineStart, endIndex).trim();

    return releaseNotes;
  } catch (error) {
    console.error(`Error extracting release notes: ${error.message}`);
    return null;
  }
}

// Extract release notes
const releaseNotes = extractReleaseNotes(version);

// Define output content
let outputContent;
if (releaseNotes) {
  console.log(`Successfully extracted release notes for version ${version}`);
  outputContent = releaseNotes;
} else {
  console.log("Could not find release notes, using generic message");
  outputContent = `No specific release notes available for version ${version}.\n\nPlease refer to the CHANGELOG.md file for detailed information about this release.`;
}

// Save to file
const outputPath = path.join(projectRoot, "RELEASE_NOTES.md");
fs.writeFileSync(outputPath, outputContent);
console.log(`Release notes saved to ${outputPath}`);
