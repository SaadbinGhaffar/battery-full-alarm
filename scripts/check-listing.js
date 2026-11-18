#!/usr/bin/env node
/**
 * Check the Play Store listing files against Google Play's length limits.
 *
 *   npm run listing:check
 *
 * Layout (same as fastlane supply, so a push tool can use it later):
 *   store/listing/<play-locale>/title.txt              max 30
 *   store/listing/<play-locale>/short_description.txt  max 80
 *   store/listing/<play-locale>/full_description.txt   max 4000
 *
 * Exits 1 if any field is missing, empty or too long.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'store', 'listing');
const FIELDS = [
  ['title.txt', 30],
  ['short_description.txt', 80],
  ['full_description.txt', 4000],
];

const length = (text) => [...text].length; // count characters, not UTF-16 units

let failed = false;
const locales = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

for (const locale of locales) {
  const cells = FIELDS.map(([file, max]) => {
    const file_ = path.join(ROOT, locale, file);
    if (!fs.existsSync(file_)) {
      failed = true;
      return `${file}: MISSING`;
    }
    const n = length(fs.readFileSync(file_, 'utf8').trim());
    const bad = n === 0 || n > max;
    if (bad) failed = true;
    return `${file.replace('.txt', '')} ${n}/${max}${bad ? ' ✗' : ''}`;
  });
  console.log(`${locale.padEnd(7)} ${cells.join('   ')}`);
}

console.log(failed ? '\nSome fields are missing or over the limit.' : `\nAll ${locales.length} listings are within Play limits.`);
process.exit(failed ? 1 : 0);
