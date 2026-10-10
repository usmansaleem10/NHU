import { describe, expect, it } from 'vitest';

import { findCoverageFailures, mergeSummaries, rebase } from './coverage.mjs';

type Counts = { total: number; covered: number; skipped: number; pct: number };
type FileCoverage = Record<'lines' | 'statements' | 'functions' | 'branches', Counts>;

const counts = (covered: number, total: number): Counts => ({
  total,
  covered,
  skipped: 0,
  pct: total === 0 ? 100 : Math.floor((10000 * covered) / total) / 100,
});
/** Same coverage on every metric keeps the cases readable. */
const cov = (covered: number, total: number): FileCoverage => ({
  lines: counts(covered, total),
  statements: counts(covered, total),
  functions: counts(covered, total),
  branches: counts(covered, total),
});

const root = '/work/hims';
const service = 'apps/api/src/features/billing/billing.service.ts';
const gate = (
  head: Record<string, FileCoverage>,
  base: Record<string, FileCoverage> | null,
  changedFiles: string[] = [service],
) =>
  findCoverageFailures({
    head,
    base,
    changedFiles,
    root,
    pattern: /^apps\/api\/src\/.*\.service\.ts$/,
    newFileMinimum: 80,
  });

describe('findCoverageFailures', () => {
  it('passes a touched service whose coverage held or rose', () => {
    expect(
      gate({ [`${root}/${service}`]: cov(9, 10) }, { [`${root}/${service}`]: cov(8, 10) }),
    ).toEqual([]);
  });

  it('fails a touched service whose coverage dropped, per metric', () => {
    const head = { [`${root}/${service}`]: { ...cov(10, 10), branches: counts(3, 4) } };
    expect(gate(head, { [`${root}/${service}`]: cov(2, 2) })).toEqual([
      { file: service, reason: 'dropped', metric: 'branches', base: 100, head: 75 },
    ]);
  });

  it('ignores drops in files the PR did not touch, and in non-service files', () => {
    const other = 'apps/api/src/features/billing/billing.controller.ts';
    const head = { [`${root}/${service}`]: cov(1, 10), [`${root}/${other}`]: cov(0, 10) };
    const base = { [`${root}/${service}`]: cov(10, 10), [`${root}/${other}`]: cov(10, 10) };
    expect(gate(head, base, [other])).toEqual([]);
  });

  it('holds a new service (no baseline) to the minimum instead', () => {
    expect(gate({ [`${root}/${service}`]: cov(85, 100) }, {})).toEqual([]);
    expect(gate({ [`${root}/${service}`]: cov(50, 100) }, null)).toHaveLength(4);
  });

  it('fails a touched service that no unit-test run loaded', () => {
    expect(gate({}, {})).toEqual([{ file: service, reason: 'not-measured' }]);
  });
});

describe('mergeSummaries', () => {
  it('recomputes the repo total from counts, not by averaging percentages', () => {
    const api = { total: cov(1, 2), [`${root}/apps/api/src/a.ts`]: cov(1, 2) };
    const db = { total: cov(98, 98), [`${root}/packages/db/src/b.ts`]: cov(98, 98) };
    const merged = mergeSummaries([api, db]);
    expect(merged['total']?.lines).toEqual({ total: 100, covered: 99, skipped: 0, pct: 99 });
    expect(Object.keys(merged)).toEqual([
      'total',
      `${root}/apps/api/src/a.ts`,
      `${root}/packages/db/src/b.ts`,
    ]);
  });
});

describe('rebase', () => {
  it('re-keys a base-checkout report under the head checkout so files line up', () => {
    const base = { total: cov(1, 1), '/tmp/base/apps/api/src/x.ts': cov(1, 1) };
    expect(Object.keys(rebase(base, '/tmp/base', root))).toEqual([
      'total',
      `${root}/apps/api/src/x.ts`,
    ]);
  });
});
