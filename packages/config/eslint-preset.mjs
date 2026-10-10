// Shared ESLint preset. The repo root eslint.config.mjs re-exports it so every
// workspace lints with the same rules (AGENTS.md "Coding conventions").
import js from '@eslint/js';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @param {{ rootDir: string }} options */
export function hims({ rootDir }) {
  return defineConfig(
    {
      ignores: [
        '**/dist/**',
        '**/coverage/**',
        '**/.turbo/**',
        '**/node_modules/**',
        'docs/**',
        'scripts/**',
      ],
    },
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    comments.recommended,
    {
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
        ],
      },
    },
    // Plain JS config files (eslint/commitlint/lint-staged configs) have no tsconfig.
    { files: ['**/*.{js,mjs,cjs}'], ...tseslint.configs.disableTypeChecked },
    // Last: switch off every stylistic rule Prettier owns, so the two never disagree.
    prettier,
  );
}
