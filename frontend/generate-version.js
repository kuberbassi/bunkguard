import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate a unique version hash based on timestamp
const version = `build-${Date.now()}`;

const versionData = {
    version: version,
    timestamp: new Date().toISOString()
};

const publicDir = path.resolve(__dirname, 'public');
const versionFile = path.resolve(publicDir, 'version.json');

// Ensure public dir exists
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

try {
    fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));
    console.log(`✅ Generated version.json: ${version}`);
} catch (error) {
    console.warn(`⚠️ Could not write version.json: ${error.message}`);
}
