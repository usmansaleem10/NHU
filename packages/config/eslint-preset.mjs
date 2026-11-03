// Shared ESLint preset. The repo root eslint.config.mjs re-exports it so every
// workspace lints with the same rules (AGENTS.md "Coding conventions").
import js from '@eslint/js';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { himsPlugin } from './src/eslint/import-boundaries.mjs';

/**
 * @param {{ rootDir: string, extraHimsRules?: Record<string, import('eslint').Rule.RuleModule> }} options
 *   extraHimsRules: more `hims/*` rules (e.g. packages/ui's React rules). ESLint allows one object
 *   per plugin namespace, so they are merged into the single `hims` plugin here.
 */
export function hims({ rootDir, extraHimsRules = {} }) {
  const plugin = { ...himsPlugin, rules: { ...himsPlugin.rules, ...extraHimsRules } };
  return defineConfig(
    {
      ignores: [
        '**/dist/**',
        '**/coverage/**',
        '**/.turbo/**',
        '**/node_modules/**',
        '.claude/**',
        'docs/**',
        'scripts/**',
      ],
    },
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    comments.recommended,
    {
      plugins: { hims: plugin },
      languageOptions: {
        globals: { ...globals.node },
        parserOptions: { projectService: true, tsconfigRootDir: rootDir },
      },
      linterOptions: { reportUnusedDisableDirectives: 'error' },
      rules: {
        // Strict-type-checked already errors on these; restating them keeps the
        // AGENTS.md bans in force if the preset ever relaxes.
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-non-null-assertion': 'error',
        // AGENTS.md: return typed DomainErrors, never throw strings.
        '@typescript-eslint/only-throw-error': 'error',
        // Ban ts-ignore; ts-expect-error is the escape hatch and must say why.
        '@typescript-eslint/ban-ts-comment': [
          'error',
          { 'ts-ignore': true, 'ts-nocheck': true, 'ts-expect-error': 'allow-with-description' },
        ],
        // Every eslint-disable needs an inline justification...
        '@eslint-community/eslint-comments/require-description': 'error',
        '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
        // ...and the AGENTS.md bans cannot be disabled at all.
        '@eslint-community/eslint-comments/no-restricted-disable': [
          'error',
          '@typescript-eslint/no-explicit-any',
          '@typescript-eslint/no-non-null-assertion',
          '@typescript-eslint/ban-ts-comment',
          'hims/import-boundaries',
        ],
        // AGENTS.md "Repo layout": another feature only via its index.ts, a workspace
        // package only via its exports (no @hims/<pkg>/src/...). Not disableable.
        'hims/import-boundaries': 'error',
        // AGENTS.md rule 9: money is a Decimal (@hims/db), never a JS number.
        'no-restricted-syntax': [
          'error',
          ...['TSPropertySignature', 'PropertyDefinition'].map((node) => ({
            selector: `${node}[key.name=/(amount|price|balance|cost|fee|tax|discount|paid|due|money)$/i] > TSTypeAnnotation > TSNumberKeyword`,
            message:
              'Money is a Decimal (@hims/db) or a decimal string in contracts, never number.',
          })),
        ],
      },
    },
    // Plain JS config files (eslint/commitlint/lint-staged configs) have no tsconfig.
    { files: ['**/*.{js,mjs,cjs}'], ...tseslint.configs.disableTypeChecked },
    // Last: switch off every stylistic rule Prettier owns, so the two never disagree.
    prettier,
  );
}
