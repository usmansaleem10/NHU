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

/** A workspace root: `.../apps/<name>` or `.../packages/<name>`; greedy, innermost wins. */
const WORKSPACE_ROOT = /^(.*\/(?:apps|packages)\/[^/]+)(?:\/|$)/;
/** Test-runner calls that take a module path: vi.mock('../x'), vi.importActual('../x'), ... */
const VI_MODULE_CALLS = new Set([
  'mock',
  'doMock',
  'unmock',
  'doUnmock',
  'importActual',
  'importMock',
]);

/**
 * @typedef {{ kind: 'feature', feature: string } | { kind: 'package' } | { kind: 'workspace' }} Violation
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

  const from = toPosix(file);
  const relative = specifier.startsWith('.');
  const resolved = relative ? path.posix.join(path.posix.dirname(from), specifier) : '';
  const workspace = WORKSPACE_ROOT.exec(from)?.[1];
  if (relative && workspace && !resolved.startsWith(`${workspace}/`)) return { kind: 'workspace' };

  const target = relative ? FEATURE_IN_PATH.exec(resolved) : FEATURE_ALIAS.exec(specifier);
  if (!target) return null;

  const [, feature = '', rest = ''] = target;
  const isPublicEntry = rest === '' || INDEX.test(rest);
  if (isPublicEntry || feature === featureOf(file)) return null;
  return { kind: 'feature', feature };
}

/**
 * Loose view of the AST nodes we read. Some are typescript-eslint nodes that the estree
 * types don't describe, so the shape is checked at runtime instead.
 * @typedef {{
 *   type?: string,
 *   value?: unknown,
 *   name?: unknown,
 *   expressions?: unknown[],
 *   quasis?: { value: { cooked?: string | null } }[],
 *   literal?: Loose,
 *   argument?: Loose,
 *   source?: Loose,
 *   expression?: Loose,
 *   moduleReference?: Loose,
 *   callee?: Loose,
 *   object?: Loose,
 *   property?: Loose,
 *   computed?: boolean,
 *   arguments?: Loose[],
 * }} Loose
 */

/**
 * The module path a node spells out: a string literal, or a template literal with no
 * `${...}` (a dynamic path can't be checked statically).
 * @param {Loose | undefined} node
 * @returns {string | null}
 */
function staticPath(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions?.length === 0) {
    return node.quasis?.[0]?.value.cooked ?? null;
  }
  return null;
}

/**
 * The module-path argument of `require('x')`, `require.resolve('x')` and `vi.mock('x')`-style
 * calls; undefined for any other call.
 * @param {Loose} call
 */
function modulePathArgument(call) {
  const callee = call.callee;
  const isRequire = callee?.type === 'Identifier' && callee.name === 'require';
  const member = callee?.type === 'MemberExpression' && !callee.computed ? callee : undefined;
  const objectName = member?.object?.type === 'Identifier' ? member.object.name : undefined;
  const propertyName = member?.property?.type === 'Identifier' ? member.property.name : undefined;
  const isRequireResolve = objectName === 'require' && propertyName === 'resolve';
  const isViModuleCall =
    objectName === 'vi' && typeof propertyName === 'string' && VI_MODULE_CALLS.has(propertyName);
  return isRequire || isRequireResolve || isViModuleCall ? call.arguments?.[0] : undefined;
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
      workspace:
        "'{{specifier}}' leaves this workspace through a relative path. Import the other workspace by its package name (@hims/...) instead.",
    },
  },
  create(context) {
    /** @param {unknown} node any node that may hold a module path */
    function check(node) {
      const specifier = staticPath(/** @type {Loose | undefined} */ (node));
      if (specifier === null) return;
      const violation = checkImport(context.filename, specifier);
      if (!violation) return;
      context.report({
        node: /** @type {import('estree').Node} */ (node),
        messageId: violation.kind,
        data: { specifier, feature: violation.kind === 'feature' ? violation.feature : '' },
      });
    }
    /** @param {unknown} node */
    const loose = (node) => /** @type {Loose} */ (node);
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
      CallExpression: (node) => {
        check(modulePathArgument(loose(node)));
      },
      // import x = require('...')
      TSImportEqualsDeclaration: (/** @type {unknown} */ node) => {
        const ref = loose(node).moduleReference;
        if (ref?.type === 'TSExternalModuleReference') check(ref.expression);
      },
      // type T = import('...').X  (the argument is a TSLiteralType in typescript-eslint 8)
      TSImportType: (/** @type {unknown} */ node) => {
        const { argument, source } = loose(node);
        check(argument?.literal ?? argument ?? source);
      },
    };
  },
};

/** @type {import('eslint').ESLint.Plugin} */
export const himsPlugin = {
  meta: { name: '@hims/eslint-plugin' },
  rules: { 'import-boundaries': importBoundaries },
};
