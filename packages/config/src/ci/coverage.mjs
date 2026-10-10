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

/** @typedef {{ file: string, basePath: string | null }} Change  basePath null = no baseline */

/**
 * Parse `git diff -M --name-status <base> HEAD`. Modified files keep their path; a rename is
 * compared against its old path in the base; added and copied files have no baseline;
 * deleted files are dropped.
 * @param {string} output
 * @returns {Change[]}
 */
export function parseNameStatus(output) {
  /** @type {Change[]} */
  const changes = [];
  for (const line of output.split('\n')) {
    const [status = '', first = '', second = ''] = line.split('\t');
    if (status.startsWith('R')) changes.push({ file: second, basePath: first });
    else if (status.startsWith('C')) changes.push({ file: second, basePath: null });
    else if (status === 'A') changes.push({ file: first, basePath: null });
    else if (status === 'M' || status === 'T') changes.push({ file: first, basePath: first });
  }
  return changes;
}

/**
 * @param {string} raw `--new-file-min`
 * @returns {number}
 */
export function parseNewFileMinimum(raw) {
  const value = raw.trim() === '' ? Number.NaN : Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`--new-file-min must be a number from 0 to 100, got "${raw}"`);
  }
  return value;
}

/**
 * @param {string} raw `--pattern`, a regular expression over repo-relative paths
 * @returns {RegExp}
 */
export function parsePattern(raw) {
  if (raw === '') throw new Error('--pattern must not be empty');
  try {
    return new RegExp(raw);
  } catch (error) {
    throw new Error(`--pattern is not a valid regular expression: ${String(error)}`, {
      cause: error,
    });
  }
}

/**
 * @typedef {{ file: string, reason: 'dropped', metric: Metric, base: number, head: number }
 *   | { file: string, reason: 'new-below-minimum', metric: Metric, head: number, minimum: number }
 *   | { file: string, reason: 'untested' }
 *   | { file: string, reason: 'not-measured' }} GateFailure
 */

/**
 * Coverage of touched files must not drop below the base. A file with no baseline (added,
 * copied, or unknown to the base report) must reach `newFileMinimum` instead. Whatever the
 * base says, a touched file whose statements never ran fails, and so does one missing from
 * the head report (its workspace produced no coverage).
 * @param {{
 *   head: Summary,
 *   base: Summary | null,
 *   changes: readonly Change[],
 *   root: string,
 *   pattern: RegExp,
 *   newFileMinimum: number,
 * }} input change paths are repo-relative; report keys are absolute under `root`
 * @returns {GateFailure[]}
 */
export function findCoverageFailures({ head, base, changes, root, pattern, newFileMinimum }) {
  /** @type {GateFailure[]} */
  const failures = [];
  for (const { file, basePath } of changes.filter((c) => pattern.test(c.file))) {
    const now = head[path.join(root, file)];
    if (!now) {
      failures.push({ file, reason: 'not-measured' });
      continue;
    }
    if (now.statements.total > 0 && now.statements.covered === 0) {
      failures.push({ file, reason: 'untested' });
      continue;
    }
    const before = basePath === null ? undefined : base?.[path.join(root, basePath)];
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
    case 'untested':
      return 'no statement in this file runs under the unit tests; add a *.spec.ts that exercises it';
    case 'not-measured':
      return "workspace produced no coverage report (no `test` script?); add one running 'vitest run --project unit --coverage'";
  }
}

/** shields.io named colours, mapped to hex for the self-drawn SVG. */
const COLORS = /** @type {const} */ ({
  brightgreen: '#4c1',
  green: '#97ca00',
  yellow: '#dfb317',
  red: '#e05d44',
  lightgrey: '#9f9f9f',
});

/**
 * README badge for repo-wide line coverage: a self-contained SVG (the repo is private, so no
 * third-party service can fetch it) and the same data as a shields.io endpoint payload.
 * Nothing measured shows "unknown" in grey, never istanbul's 100% for zero lines.
 * @param {FileCoverage | undefined} total
 */
export function badge(total) {
  const measured = total !== undefined && total.lines.total > 0;
  const pct = measured ? total.lines.pct : 0;
  /** @type {keyof typeof COLORS} */
  const color = !measured
    ? 'lightgrey'
    : pct >= 90
      ? 'brightgreen'
      : pct >= 75
        ? 'green'
        : pct >= 60
          ? 'yellow'
          : 'red';
  const message = measured ? `${pct.toFixed(1)}%` : 'unknown';
  return {
    endpoint: { schemaVersion: 1, label: 'coverage', message, color },
    svg: badgeSvg(message, COLORS[color]),
  };
}

/**
 * Flat, shields-style SVG. Widths approximate Verdana 11px (about 7px per character).
 * @param {string} message
 * @param {string} fill
 */
function badgeSvg(message, fill) {
  const labelWidth = 63;
  const valueWidth = 10 + message.length * 7;
  const width = labelWidth + valueWidth;
  const n = (/** @type {number} */ v) => String(v);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}" height="20" role="img" aria-label="coverage: ${message}">
  <title>coverage: ${message}</title>
  <clipPath id="r"><rect width="${n(width)}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${n(labelWidth)}" height="20" fill="#555"/>
    <rect x="${n(labelWidth)}" width="${n(valueWidth)}" height="20" fill="${fill}"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${n(labelWidth / 2)}" y="14">coverage</text>
    <text x="${n(labelWidth + valueWidth / 2)}" y="14">${message}</text>
  </g>
</svg>
`;
}

/**
 * Markdown for $GITHUB_STEP_SUMMARY: repo-wide totals per metric.
 * @param {FileCoverage | undefined} total
 */
export function summaryMarkdown(total) {
  if (!total || total.lines.total === 0) {
    return '### Coverage\n\nNo workspace produced a coverage report.\n';
  }
  const rows = METRICS.map(
    (m) =>
      `| ${m} | ${total[m].pct.toFixed(2)}% | ${String(total[m].covered)} / ${String(total[m].total)} |`,
  );
  return [
    '### Coverage (unit tests, all workspaces)',
    '',
    '| Metric | % | Covered / total |',
    '|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}
