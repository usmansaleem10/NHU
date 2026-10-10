// Coverage maths for CI (F0-REPO-08): merge per-workspace Vitest json-summary reports, gate
// touched apps/api service files against the PR base, and build the README badge payload.
import path from 'node:path';

export const METRICS = /** @type {const} */ (['lines', 'statements', 'functions', 'branches']);

/** @typedef {(typeof METRICS)[number]} Metric */
/** @typedef {{ total: number, covered: number, skipped: number, pct: number }} Counts */
/** @typedef {Record<Metric, Counts>} FileCoverage */
/** @typedef {Record<string, FileCoverage>} Summary  json-summary: "total" plus one key per absolute file path */

/**
 * Istanbul's percentage: 100 when there is nothing to cover, else floored to 2 decimals.
 * @param {number} covered
 * @param {number} total
 */
export function percent(covered, total) {
  return total === 0 ? 100 : Math.floor((10000 * covered) / total) / 100;
}

/**
 * Combine several workspaces' json-summary reports into one repo-wide report.
 * @param {Summary[]} summaries
 * @returns {Summary}
 */
export function mergeSummaries(summaries) {
  /** @type {Summary} */
  const merged = {};
  /** @type {Record<Metric, { total: number, covered: number, skipped: number }>} */
  const sums = {
    lines: { total: 0, covered: 0, skipped: 0 },
    statements: { total: 0, covered: 0, skipped: 0 },
    functions: { total: 0, covered: 0, skipped: 0 },
    branches: { total: 0, covered: 0, skipped: 0 },
  };
  for (const summary of summaries) {
    for (const [file, coverage] of Object.entries(summary)) {
      if (file !== 'total') merged[file] = coverage;
    }
    const total = summary['total'];
    if (!total) continue;
    for (const metric of METRICS) {
      sums[metric].total += total[metric].total;
      sums[metric].covered += total[metric].covered;
      sums[metric].skipped += total[metric].skipped;
    }
  }
  /** @param {Metric} m @returns {Counts} */
  const counts = (m) => ({ ...sums[m], pct: percent(sums[m].covered, sums[m].total) });
  return {
    total: {
      lines: counts('lines'),
      statements: counts('statements'),
      functions: counts('functions'),
      branches: counts('branches'),
    },
    ...merged,
  };
}

/**
 * Re-key a report produced in another checkout (the PR base) as if it ran under `toRoot`,
 * so its file keys line up with the head report.
 * @template T
 * @param {Record<string, T>} report json-summary or coverage-final (both keyed by absolute path)
 * @param {string} fromRoot
 * @param {string} toRoot
 * @returns {Record<string, T>}
 */
export function rebase(report, fromRoot, toRoot) {
  const prefix = fromRoot.endsWith(path.sep) ? fromRoot : fromRoot + path.sep;
  return Object.fromEntries(
    Object.entries(report).map(([key, value]) => [
      key.startsWith(prefix) ? path.join(toRoot, key.slice(prefix.length)) : key,
      value,
    ]),
  );
}

/**
 * @typedef {{ file: string, reason: 'dropped', metric: Metric, base: number, head: number }
 *   | { file: string, reason: 'new-below-minimum', metric: Metric, head: number, minimum: number }
 *   | { file: string, reason: 'not-measured' }} GateFailure
 */

/**
 * Coverage of touched files must not drop below the base branch. A file the base doesn't
 * know has no baseline, so it must reach `newFileMinimum` instead. A touched file missing
 * from the head report was never loaded by a unit-test run, which also fails.
 * @param {{
 *   head: Summary,
 *   base: Summary | null,
 *   changedFiles: readonly string[],
 *   root: string,
 *   pattern: RegExp,
 *   newFileMinimum: number,
 * }} input changedFiles are repo-relative; report keys are absolute under `root`
 * @returns {GateFailure[]}
 */
export function findCoverageFailures({ head, base, changedFiles, root, pattern, newFileMinimum }) {
  /** @type {GateFailure[]} */
  const failures = [];
  for (const file of changedFiles.filter((f) => pattern.test(f))) {
    const key = path.join(root, file);
    const now = head[key];
    if (!now) {
      failures.push({ file, reason: 'not-measured' });
      continue;
    }
    const before = base?.[key];
    for (const metric of METRICS) {
      if (before) {
        if (now[metric].pct < before[metric].pct) {
          failures.push({
            file,
            reason: 'dropped',
            metric,
            base: before[metric].pct,
            head: now[metric].pct,
          });
        }
      } else if (now[metric].pct < newFileMinimum) {
        failures.push({
          file,
          reason: 'new-below-minimum',
          metric,
          head: now[metric].pct,
          minimum: newFileMinimum,
        });
      }
    }
  }
  return failures;
}

/** @param {GateFailure} failure */
export function describeFailure(failure) {
  switch (failure.reason) {
    case 'dropped':
      return `${failure.metric} coverage dropped from ${String(failure.base)}% to ${String(failure.head)}%`;
    case 'new-below-minimum':
      return `new file: ${failure.metric} coverage ${String(failure.head)}% is below the ${String(failure.minimum)}% minimum for files with no baseline`;
    case 'not-measured':
      return 'not loaded by any unit-test run (no coverage entry); add a *.spec.ts for it';
  }
}

/**
 * shields.io endpoint payload (https://shields.io/badges/endpoint-badge). CI publishes it to
 * the coverage-badge branch and the README badge reads it, so no token or secret is needed.
 * @param {number} pct
 */
export function badgeEndpoint(pct) {
  const color = pct >= 90 ? 'brightgreen' : pct >= 75 ? 'green' : pct >= 60 ? 'yellow' : 'red';
  return { schemaVersion: 1, label: 'coverage', message: `${pct.toFixed(1)}%`, color };
}
