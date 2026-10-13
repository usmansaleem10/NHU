#!/usr/bin/env node
// F0-UI-01 acceptance: initial JS < 250 KB gzipped. "Initial" = every module script plus every
// modulepreload that index.html references; lazily loaded route chunks are excluded.
// Usage: node check-bundle-size.mjs [distDir=dist]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 250 * 1024;
const dist = join(import.meta.dirname, '..', process.argv[2] ?? 'dist');
const html = readFileSync(join(dist, 'index.html'), 'utf8');

/** Attributes of a tag as a map, independent of their order. @param {string} tag */
const attrs = (tag) =>
  Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]));

const refs = new Set();
for (const [tag] of html.matchAll(/<script\b[^>]*>/g)) {
  const a = attrs(tag);
  if (a.type === 'module' && a.src) refs.add(a.src);
}
for (const [tag] of html.matchAll(/<link\b[^>]*>/g)) {
  const a = attrs(tag);
  if (a.rel === 'modulepreload' && a.href) refs.add(a.href);
}

// Fail closed: finding nothing to measure means the check is broken, not that the app is small.
if (refs.size === 0) {
  console.error('No entry scripts found in index.html — bundle budget cannot be checked.');
  process.exit(1);
}

let total = 0;
for (const ref of refs) {
  const size = gzipSync(readFileSync(join(dist, ref.replace(/^\//, '')))).length;
  total += size;
  console.log(`  ${(size / 1024).toFixed(1).padStart(7)} KB gz  ${ref}`);
}
console.log(
  `initial JS: ${(total / 1024).toFixed(1)} KB gz (budget ${String(BUDGET_BYTES / 1024)} KB)`,
);
if (total > BUDGET_BYTES) {
  console.error('Initial JS exceeds the 250 KB gz budget — split the new code into a lazy route.');
  process.exit(1);
}
