// update-version.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { appVersion } from "./version.mjs";

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json
const packageJsonPath = path.join(__dirname, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Update version
packageJson.version = appVersion;

// Write updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log(`Updated package.json to version ${appVersion}`);
