#!/usr/bin/env node
// hims-coverage: CI coverage helper (F0-REPO-08). See .github/workflows/ci.yml.
//
//   hims-coverage merge --root <checkout> [--as-root <dir>] --out <dir>
//       Merge every {apps,packages}/*/coverage/coverage-{summary,final}.json into <dir>.
//       --as-root re-keys file paths (used for the PR-base checkout so keys match the head).
//   hims-coverage gate --head <summary.json> [--base <summary.json>] --changed <list.txt>
//                      [--root <checkout>] [--pattern <regex>] [--new-file-min <pct>]
//       Exit 1 if a touched file matching --pattern lost coverage versus the base.
//   hims-coverage badge --summary <summary.json> --out <coverage.json>  (shields.io endpoint)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import {
  badgeEndpoint,
  describeFailure,
  findCoverageFailures,
  mergeSummaries,
  rebase,
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
    head: { type: 'string' },
    base: { type: 'string' },
    changed: { type: 'string' },
    pattern: { type: 'string', default: String.raw`^apps/api/src/.*\.service\.ts$` },
    'new-file-min': { type: 'string', default: '80' },
    summary: { type: 'string' },
  },
});
const root = path.resolve(values.root);

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
  case 'gate': {
    const basePath = values.base;
    const base = basePath && existsSync(basePath) ? readSummary(basePath) : null;
    const changedFiles = readFileSync(required(values, 'changed'), 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const failures = findCoverageFailures({
      head: readSummary(required(values, 'head')),
      base,
      changedFiles,
      root,
      pattern: new RegExp(values.pattern),
      newFileMinimum: Number(values['new-file-min']),
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
    if (!total) throw new Error('summary has no "total" entry');
    const out = required(values, 'out');
    writeJson(out, badgeEndpoint(total.lines.pct));
    console.log(`Wrote ${out} (${String(total.lines.pct)}% lines)`);
    break;
  }
  default:
    console.error(
      'Usage: hims-coverage <merge|gate|badge> [options] (see header of coverage-cli.mjs)',
    );
    process.exitCode = 2;
}
