const { copyFileSync, mkdirSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const webFiles = require("./web-files.cjs");

const output = join(__dirname, ".vercel-static");
const filenames = new Set(webFiles.map(([name]) => name));
mkdirSync(output, { recursive: true });
for (const name of readdirSync(output)) {
  if (!filenames.has(name)) throw new Error(`Unerwartete Datei im öffentlichen Build-Verzeichnis: ${name}`);
}
for (const name of filenames) copyFileSync(join(__dirname, name), join(output, name));
console.log(`${filenames.size} öffentliche App-Dateien für Vercel erstellt.`);
