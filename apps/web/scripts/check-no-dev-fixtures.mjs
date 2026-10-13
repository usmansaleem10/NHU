#!/usr/bin/env node
// Guards the production bundle against dev fixtures (fake personas, demo records, persona switch).
// Fixtures load only behind import.meta.env.DEV / VITE_DEV_FIXTURES; if a static import ever
// leaks them in, this catches it.
//
//   node check-no-dev-fixtures.mjs <distDir>                     fail if ANY marker is found
//   node check-no-dev-fixtures.mjs --expect-fixtures <distDir>   self-test: fail unless EVERY
//       marker is found. Run on the fixture (E2E) build, it proves the markers still survive
//       minification, so the production check above cannot silently pass on a dead marker.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Runtime strings that exist only in src/dev-fixtures and survive minification (string
// literals, not identifiers, comments or template fragments).
const MARKERS = ['hims.dev.persona', 'Demo Admin', 'Demo Nurse', 'Demo Patient', 'Demo Hospital'];

const args = process.argv.slice(2);
const expectFixtures = args.includes('--expect-fixtures');
const dist = args.find((a) => !a.startsWith('--'));
if (!dist) {
  console.error('usage: check-no-dev-fixtures [--expect-fixtures] <distDir>');
  process.exit(2);
}

/** @param {string} dir @returns {string[]} */
const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(js|html)$/.test(name) ? [path] : [];
  });

const found = new Map(); // marker -> files containing it
for (const file of files(dist)) {
  const text = readFileSync(file, 'utf8');
  for (const marker of MARKERS) {
    if (text.includes(marker))
      found.set(marker, [...(found.get(marker) ?? []), relative(dist, file)]);
  }
}

if (expectFixtures) {
  const missing = MARKERS.filter((m) => !found.has(m));
  if (missing.length > 0) {
    console.error(
      `Fixture-marker self-test failed: ${missing.map((m) => `"${m}"`).join(', ')} not found in ` +
        `the fixture build. Update MARKERS so the production check can still detect fixtures.`,
    );
    process.exit(1);
  }
  console.log(`fixture markers detected in ${dist} (production guard is live)`);
} else {
  if (found.size > 0) {
    const lines = [...found].flatMap(([m, fs]) => fs.map((f) => `${f}: "${m}"`));
    console.error(`Dev fixtures found in the production bundle:\n  ${lines.join('\n  ')}`);
    process.exit(1);
  }
  console.log('no dev fixtures in the production bundle');
}
