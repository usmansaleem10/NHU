// hims/import-boundaries (F0-REPO-11). AGENTS.md "Repo layout": a feature is imported only
// through its index.ts, and a workspace package only through its package exports.
import path from 'node:path';

/** `.../src/features/<feature>/<rest>` in an absolute path; greedy so the innermost src wins. */
const FEATURE_IN_PATH = /^.*\/src\/features\/([^/]+)(?:\/(.*))?$/;
/** Path aliases into an app's src: `@/features/x/...`, `~/features/x/...`, `#features/x/...`. */
const FEATURE_ALIAS = /^(?:@\/|~\/|#)(?:src\/)?features\/([^/]+)(?:\/(.*))?$/;
/** `@hims/<pkg>/src/...` or `@hims/<pkg>/dist/...` bypasses the package's exports map. */
const PACKAGE_INTERNALS = /^@hims\/[^/]+\/(?:src|dist)(?:\/|$)/;
const INDEX = /^index(?:\.[cm]?[jt]sx?)?$/;

/**
 * @typedef {{ kind: 'feature', feature: string } | { kind: 'package' }} Violation
 */

/** @param {string} p */
const toPosix = (p) => p.replaceAll('\\', '/');

/**
 * The feature an absolute file path belongs to, or null outside `src/features/`.
 * @param {string} file
 */
export function featureOf(file) {
  return FEATURE_IN_PATH.exec(toPosix(file))?.[1] ?? null;
}

/**
 * Decide whether `specifier`, imported from `file`, breaks an import boundary.
 * @param {string} file absolute path of the importing file
 * @param {string} specifier the module specifier as written
 * @returns {Violation | null}
 */
export function checkImport(file, specifier) {
  if (PACKAGE_INTERNALS.test(specifier)) return { kind: 'package' };

  const target = specifier.startsWith('.')
    ? FEATURE_IN_PATH.exec(path.posix.join(path.posix.dirname(toPosix(file)), specifier))
    : FEATURE_ALIAS.exec(specifier);
  if (!target) return null;

  const [, feature = '', rest = ''] = target;
  const isPublicEntry = rest === '' || INDEX.test(rest);
  if (isPublicEntry || feature === featureOf(file)) return null;
  return { kind: 'feature', feature };
}

/** @type {import('eslint').Rule.RuleModule} */
export const importBoundaries = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Import another feature only through its index.ts, and a workspace package only through its exports (AGENTS.md 'Repo layout')",
    },
    schema: [],
    messages: {
      feature:
        "'{{specifier}}' reaches into feature '{{feature}}'. Import its public API (features/{{feature}}/index.ts) instead; export what you need from there.",
      package:
        "'{{specifier}}' reaches into a workspace package's internals. Import from the package name and add what you need to its exports.",
    },
  },
  create(context) {
    /** @param {import('estree').Node | null | undefined} source */
    function check(source) {
      if (source?.type !== 'Literal' || typeof source.value !== 'string') return;
      const violation = checkImport(context.filename, source.value);
      if (!violation) return;
      context.report({
        node: source,
        messageId: violation.kind,
        data: {
          specifier: source.value,
          feature: violation.kind === 'feature' ? violation.feature : '',
        },
      });
    }
    return {
      ImportDeclaration: (node) => {
        check(node.source);
      },
      ExportNamedDeclaration: (node) => {
        check(node.source);
      },
      ExportAllDeclaration: (node) => {
        check(node.source);
      },
      ImportExpression: (node) => {
        check(node.source);
      },
    };
  },
};

/** @type {import('eslint').ESLint.Plugin} */
export const himsPlugin = {
  meta: { name: '@hims/eslint-plugin' },
  rules: { 'import-boundaries': importBoundaries },
};
