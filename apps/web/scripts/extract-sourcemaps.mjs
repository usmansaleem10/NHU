#!/usr/bin/env node
// Moves source maps out of the deployable dist (they expose the full source when served) into a
// separate folder for error-report symbolication, then fails if any map is left behind.
// Vite's sourcemap: 'hidden' already omits the //# sourceMappingURL comments.
// Usage: node extract-sourcemaps.mjs <distDir> <mapsDir>
import { mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const [dist, out] = process.argv.slice(2);
if (!dist || !out) {
  console.error('usage: extract-sourcemaps <distDir> <mapsDir>');
  process.exit(2);
}

/** @param {string} dir @returns {string[]} */
const maps = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return maps(path);
    return name.endsWith('.map') ? [path] : [];
  });

rmSync(out, { recursive: true, force: true });
const moved = maps(dist);
for (const file of moved) {
  const target = join(out, relative(dist, file));
  mkdirSync(dirname(target), { recursive: true });
  renameSync(file, target);
}

const left = maps(dist);
if (left.length > 0) {
  console.error(`Source maps still in ${dist}:\n  ${left.join('\n  ')}`);
  process.exit(1);
}
console.log(`moved ${String(moved.length)} source map(s) to ${out}; none left in ${dist}`);
