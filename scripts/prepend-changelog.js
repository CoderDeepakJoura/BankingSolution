// Prepends a new entry to the top of changelog.ts array.
// Usage: node scripts/prepend-changelog.js <version> <date-iso> <note> <file>

const fs = require('fs');

const [,, version, date, note, file] = process.argv;

if (!version || !date || !note || !file) {
  console.error('Usage: node prepend-changelog.js <version> <date-iso> <note> <file>');
  process.exit(1);
}

const content = fs.readFileSync(file, 'utf8');
const MARKER = 'export const changelog: VersionEntry[] = [\n';
const idx = content.indexOf(MARKER);

if (idx === -1) {
  console.error('prepend-changelog: could not find changelog array marker in', file);
  process.exit(1);
}

const entry =
  `  {\n` +
  `    version: "${version}",\n` +
  `    date: "${date}",\n` +
  `    changes: [\n` +
  `      { type: "improvement", text: ${JSON.stringify(note)} },\n` +
  `    ],\n` +
  `  },\n`;

const updated =
  content.slice(0, idx + MARKER.length) +
  entry +
  content.slice(idx + MARKER.length);

fs.writeFileSync(file, updated, 'utf8');
console.log(`prepend-changelog: added entry for v${version}`);
