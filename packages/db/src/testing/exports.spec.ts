import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/** Relative modules reachable from an entry file (static imports and re-exports). */
function reachable(entry: string, seen = new Set<string>()): Set<string> {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const source = readFileSync(entry, 'utf8');
  for (const [, spec] of source.matchAll(/from '(\.[^']+)\.js'/g)) {
    if (spec) reachable(resolve(dirname(entry), `${spec}.ts`), seen);
  }
  return seen;
}

describe('@hims/db/testing entry point', () => {
  it('does not pull in testcontainers or drizzle-kit (those live in ./testing/containers)', () => {
    const offenders = [...reachable(join(import.meta.dirname, 'index.ts'))].filter((file) =>
      /from '(@testcontainers\/|testcontainers|drizzle-kit)/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
