#!/usr/bin/env node
// hims-coverage: CI coverage helper (F0-REPO-08). See .github/workflows/ci.yml.
//
//   hims-coverage merge --root <checkout> [--as-root <dir>] --out <dir>
//       Merge every {apps,packages}/*/coverage/coverage-{summary,final}.json into <dir>.
//       --as-root re-keys file paths (used for the PR-base checkout so keys match the head).
//   hims-coverage touches --changed <name-status.txt> [--pattern <regex>]
//       Exit 0 if a changed file matches --pattern, 1 if none does (CI skips the base run).
//   hims-coverage gate --head <summary.json> [--base <summary.json>] --changed <name-status.txt>
//                      [--root <checkout>] [--pattern <regex>] [--new-file-min <0-100>]
//       Exit 1 if a touched file matching --pattern lost coverage versus the base.
//       <name-status.txt> is `git diff -M --name-status <base> HEAD` (renames are followed).
//   hims-coverage badge --summary <summary.json> --out-dir <dir>
//       Write coverage.svg and coverage.json (shields.io endpoint); append totals to
//       $GITHUB_STEP_SUMMARY when it is set.
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import {
  badge,
  describeFailure,
  findCoverageFailures,
  mergeSummaries,
  parseNameStatus,
  parseNewFileMinimum,
  parsePattern,
  rebase,
  summaryMarkdown,
} from './coverage.mjs';

/** @typedef {import("./coverage.mjs").Summary} Summary */

/** JSON reports written by Vitest (or by `merge`); trusted, so typed by assertion. */
const readSummary = (/** @type {string} */ file) =>
  /** @type {Summary} */ (JSON.parse(readFileSync(file, 'utf8')));
const readReport = (/** @type {string} */ file) =>
  /** @type {Record<string, unknown>} */ (JSON.parse(readFileSync(file, 'utf8')));

/** @param {string} file @param {unknown} data */
const writeJson = (file, data) => {
  writeFileSync(file, JSON.stringify(data));
};

/** @param {string} root @param {string} name */
function workspaceReports(root, name) {
  return ['apps', 'packages'].flatMap((group) => {
    const dir = path.join(root, group);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .map((ws) => path.join(dir, ws, 'coverage', name))
      .filter((file) => existsSync(file));
  });
}

/** @param {Record<string, string | boolean | undefined>} values @param {string} key */
function required(values, key) {
  const value = values[key];
  if (typeof value !== 'string') throw new Error(`--${key} is required`);
  return value;
}

const [command, ...rest] = process.argv.slice(2);
const { values } = parseArgs({
  args: rest,
  options: {
    root: { type: 'string', default: process.cwd() },
    'as-root': { type: 'string' },
    out: { type: 'string' },
    'out-dir': { type: 'string' },
    head: { type: 'string' },
    base: { type: 'string' },
    changed: { type: 'string' },
    pattern: { type: 'string', default: String.raw`^apps/api/src/.*\.service\.ts$` },
    'new-file-min': { type: 'string', default: '80' },
    summary: { type: 'string' },
  },
});
const root = path.resolve(values.root);
const pattern = parsePattern(values.pattern);
const changes = () => parseNameStatus(readFileSync(required(values, 'changed'), 'utf8'));

switch (command) {
  case 'merge': {
    const out = required(values, 'out');
    const asRoot = values['as-root'];
    /** @param {Record<string, unknown>} report */
    const rekey = (report) => (asRoot ? rebase(report, root, path.resolve(asRoot)) : report);
    const summaries = workspaceReports(root, 'coverage-summary.json').map(readSummary);
    const finals = workspaceReports(root, 'coverage-final.json').map(readReport);
    mkdirSync(out, { recursive: true });
    writeJson(path.join(out, 'coverage-summary.json'), rekey(mergeSummaries(summaries)));
    writeJson(path.join(out, 'coverage-final.json'), rekey(Object.assign({}, ...finals)));
    console.log(`Merged ${String(summaries.length)} workspace coverage report(s) into ${out}`);
    break;
  }
  case 'touches': {
    const touched = changes().filter((c) => pattern.test(c.file));
    console.log(`${String(touched.length)} changed file(s) match ${values.pattern}`);
    process.exitCode = touched.length > 0 ? 0 : 1;
    break;
  }
  case 'gate': {
    const newFileMinimum = parseNewFileMinimum(values['new-file-min']);
    const basePath = values.base;
    const base = basePath && existsSync(basePath) ? readSummary(basePath) : null;
    const failures = findCoverageFailures({
      head: readSummary(required(values, 'head')),
      base,
      changes: changes(),
      root,
      pattern,
      newFileMinimum,
    });
    if (!base) console.log('No base coverage report: touched files are treated as new.');
    for (const failure of failures) {
      // GitHub annotation on the file; plain text elsewhere.
      console.log(`::error file=${failure.file}::${describeFailure(failure)}`);
    }
    if (failures.length > 0) {
      console.log(`Coverage gate failed: ${String(failures.length)} problem(s).`);
      process.exitCode = 1;
    } else {
      console.log(
        `Coverage gate passed: no touched file matching ${values.pattern} lost coverage.`,
      );
    }
    break;
  }
  case 'badge': {
    const total = readSummary(required(values, 'summary'))['total'];
    const outDir = required(values, 'out-dir');
    const { endpoint, svg } = badge(total);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, 'coverage.svg'), svg);
    writeJson(path.join(outDir, 'coverage.json'), endpoint);
    const stepSummary = process.env['GITHUB_STEP_SUMMARY'];
    if (stepSummary) appendFileSync(stepSummary, summaryMarkdown(total));
    console.log(`Wrote coverage.svg and coverage.json to ${outDir} (${endpoint.message})`);
    break;
  }
  default:
    console.error(
      'Usage: hims-coverage <merge|touches|gate|badge> [options] (see header of coverage-cli.mjs)',
    );
    process.exitCode = 2;
}
