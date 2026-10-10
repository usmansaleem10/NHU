#!/usr/bin/env node
// Fails when a stylesheet outside the token file holds a raw colour (F0-REPO-10).
// Usage: node check-css-colours.mjs <dir> [<dir> ...]
// Only files named tokens.css may define colours; everything else uses var(--token).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { findRawColour } from '../eslint-plugin.mjs';

const ALLOWED = new Set(['tokens.css']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo']);

/** @param {string} dir @returns {string[]} */
function cssFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return SKIP_DIRS.has(name) ? [] : cssFiles(path);
    return name.endsWith('.css') && !ALLOWED.has(name) ? [path] : [];
  });
}

const dirs = process.argv.slice(2);
if (dirs.length === 0) {
  console.error('usage: check-css-colours <dir> [<dir> ...]');
  process.exit(2);
}

let failures = 0;
for (const file of dirs.flatMap(cssFiles)) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      // Comments may mention colours when documenting tokens.
      const code = line.replace(/\/\*.*?\*\//g, '').replace(/^\s*\*.*$/, '');
      const hit = findRawColour(code);
      if (hit) {
        failures += 1;
        console.error(
          `${relative(process.cwd(), file)}:${i + 1}  raw ${hit.what} "${hit.match}" — use a token from tokens.css`,
        );
      }
    });
}

if (failures > 0) {
  console.error(`\n${failures} raw colour value(s) outside tokens.css`);
  process.exit(1);
}
