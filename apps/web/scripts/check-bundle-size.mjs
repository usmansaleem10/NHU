#!/usr/bin/env node
// F0-UI-01 acceptance: initial JS < 250 KB gzipped. "Initial" = the entry module plus every chunk
// index.html preloads; lazily loaded route chunks are excluded. Runs after `vite build`.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 250 * 1024;
const dist = join(import.meta.dirname, '..', 'dist');
const html = readFileSync(join(dist, 'index.html'), 'utf8');

const refs = new Set();
for (const m of html.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+\.js)"/g)) refs.add(m[1]);
for (const m of html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/g))
  refs.add(m[1]);

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
