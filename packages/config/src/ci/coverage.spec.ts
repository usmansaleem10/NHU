import { describe, expect, it } from 'vitest';

import {
  badge,
  findCoverageFailures,
  mergeSummaries,
  parseNameStatus,
  parseNewFileMinimum,
  parsePattern,
  rebase,
} from './coverage.mjs';

type Counts = { total: number; covered: number; skipped: number; pct: number };
type FileCoverage = Record<'lines' | 'statements' | 'functions' | 'branches', Counts>;
type Change = { file: string; basePath: string | null };

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
const at = (file: string) => `${root}/${file}`;
const gate = (
  head: Record<string, FileCoverage>,
  base: Record<string, FileCoverage> | null,
  changes: Change[] = [{ file: service, basePath: service }],
) =>
  findCoverageFailures({
    head,
    base,
    changes,
    root,
    pattern: /^apps\/api\/src\/.*\.service\.ts$/,
    newFileMinimum: 80,
  });

describe('findCoverageFailures', () => {
  it('passes a touched service whose coverage held or rose', () => {
    expect(gate({ [at(service)]: cov(9, 10) }, { [at(service)]: cov(8, 10) })).toEqual([]);
  });

  it('fails a touched service whose coverage dropped, per metric', () => {
    const head = { [at(service)]: { ...cov(10, 10), branches: counts(3, 4) } };
    expect(gate(head, { [at(service)]: cov(2, 2) })).toEqual([
      { file: service, reason: 'dropped', metric: 'branches', base: 100, head: 75 },
    ]);
  });

  it('ignores drops in files the PR did not touch, and in non-service files', () => {
    const other = 'apps/api/src/features/billing/billing.controller.ts';
    const head = { [at(service)]: cov(1, 10), [at(other)]: cov(0, 10) };
    const base = { [at(service)]: cov(10, 10), [at(other)]: cov(10, 10) };
    expect(gate(head, base, [{ file: other, basePath: other }])).toEqual([]);
  });

  it('holds a new service (no baseline) to the minimum instead', () => {
    const added = [{ file: service, basePath: null }];
    expect(gate({ [at(service)]: cov(85, 100) }, {}, added)).toEqual([]);
    expect(gate({ [at(service)]: cov(50, 100) }, null, added)).toHaveLength(4);
  });

  it('fails a touched service with no executed statement, even if the base was also untested', () => {
    expect(gate({ [at(service)]: cov(0, 12) }, { [at(service)]: cov(0, 12) })).toEqual([
      { file: service, reason: 'untested' },
    ]);
  });

  it('compares a renamed service against the base entry of its old path', () => {
    const old = 'apps/api/src/features/billing/invoice.service.ts';
    const renamed = [{ file: service, basePath: old }];
    expect(gate({ [at(service)]: cov(5, 10) }, { [at(old)]: cov(9, 10) }, renamed)).toHaveLength(4);
    expect(gate({ [at(service)]: cov(9, 10) }, { [at(old)]: cov(9, 10) }, renamed)).toEqual([]);
  });

  it('fails a touched service whose workspace produced no coverage report', () => {
    expect(gate({}, {})).toEqual([{ file: service, reason: 'not-measured' }]);
  });
});

describe('parseNameStatus', () => {
  it('maps git diff -M --name-status to head paths and their base paths', () => {
    const out = [
      'M\tapps/api/src/a.service.ts',
      'A\tapps/api/src/b.service.ts',
      'R087\tapps/api/src/old.service.ts\tapps/api/src/new.service.ts',
      'C075\tapps/api/src/c.service.ts\tapps/api/src/copy.service.ts',
      'D\tapps/api/src/gone.service.ts',
      '',
    ].join('\n');
    expect(parseNameStatus(out)).toEqual([
      { file: 'apps/api/src/a.service.ts', basePath: 'apps/api/src/a.service.ts' },
      { file: 'apps/api/src/b.service.ts', basePath: null },
      { file: 'apps/api/src/new.service.ts', basePath: 'apps/api/src/old.service.ts' },
      { file: 'apps/api/src/copy.service.ts', basePath: null },
    ]);
  });
});

describe('CLI option parsing', () => {
  it('accepts a finite 0-100 new-file minimum and rejects anything else', () => {
    expect(parseNewFileMinimum('80')).toBe(80);
    expect(parseNewFileMinimum('0')).toBe(0);
    for (const bad of ['', 'abc', '-1', '101', 'NaN', 'Infinity']) {
      expect(() => parseNewFileMinimum(bad)).toThrow(/--new-file-min/);
    }
  });

  it('rejects an invalid --pattern with a clear error', () => {
    expect(
      parsePattern(String.raw`^apps/api/src/.*\.service\.ts$`).test('apps/api/src/x.service.ts'),
    ).toBe(true);
    expect(() => parsePattern('(unclosed')).toThrow(/--pattern/);
    expect(() => parsePattern('')).toThrow(/--pattern/);
  });
});

describe('badge', () => {
  it('reports repo line coverage', () => {
    const b = badge(cov(3, 4));
    expect(b.endpoint).toMatchObject({ message: '75.0%', color: 'green' });
    expect(b.svg).toContain('75.0%');
  });

  it('shows "unknown" in grey, not 100%, when nothing was measured', () => {
    for (const total of [cov(0, 0), undefined]) {
      const b = badge(total);
      expect(b.endpoint).toMatchObject({ message: 'unknown', color: 'lightgrey' });
      expect(b.svg).toContain('unknown');
      expect(b.svg).not.toContain('100');
    }
  });
});

describe('mergeSummaries', () => {
  it('recomputes the repo total from counts, not by averaging percentages', () => {
    const api = { total: cov(1, 2), [at('apps/api/src/a.ts')]: cov(1, 2) };
    const db = { total: cov(98, 98), [at('packages/db/src/b.ts')]: cov(98, 98) };
    const merged = mergeSummaries([api, db]);
    expect(merged['total']?.lines).toEqual({ total: 100, covered: 99, skipped: 0, pct: 99 });
    expect(Object.keys(merged)).toEqual([
      'total',
      at('apps/api/src/a.ts'),
      at('packages/db/src/b.ts'),
    ]);
  });
});

describe('rebase', () => {
  it('re-keys a base-checkout report under the head checkout so files line up', () => {
    const base = { total: cov(1, 1), '/tmp/base/apps/api/src/x.ts': cov(1, 1) };
    expect(Object.keys(rebase(base, '/tmp/base', root))).toEqual([
      'total',
      at('apps/api/src/x.ts'),
    ]);
  });
});
