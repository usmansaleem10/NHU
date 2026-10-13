#!/usr/bin/env node
// Fails a production build that contains dev fixtures (fake personas, demo records, persona
// switch). Fixtures load only behind import.meta.env.DEV / VITE_DEV_FIXTURES; if a static import
// ever leaks them in, this catches it. Usage: node check-no-dev-fixtures.mjs <distDir>
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Runtime strings that exist only in src/dev-fixtures (comments are stripped by the minifier).
const MARKERS = ['hims.dev.persona', 'Demo Admin', 'Demo Patient', 'Demo Hospital', 'Department 0'];

const dist = process.argv[2];
if (!dist) {
  console.error('usage: check-no-dev-fixtures <distDir>');
  process.exit(2);
}

/** @param {string} dir @returns {string[]} */
const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'e2e' ? [] : files(path);
    return /\.(js|html)$/.test(name) ? [path] : [];
  });

const hits = [];
for (const file of files(dist)) {
  const text = readFileSync(file, 'utf8');
  for (const marker of MARKERS)
    if (text.includes(marker)) hits.push(`${relative(dist, file)}: "${marker}"`);
}

if (hits.length > 0) {
  console.error(`Dev fixtures found in the production bundle:\n  ${hits.join('\n  ')}`);
  process.exit(1);
}
console.log('no dev fixtures in the production bundle');
