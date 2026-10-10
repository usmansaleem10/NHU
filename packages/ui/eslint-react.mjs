// React/browser layer on top of the shared @hims/config preset, used by packages/ui and apps/web
// via their own eslint.config.mjs (ESLint 10 resolves the nearest config per file).
// Candidate to move into @hims/config once tooling owns a React preset.
import { hims } from '@hims/config/eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

import himsUi from './eslint-plugin.mjs';

/**
 * @param {{ rootDir: string, uiStringFiles: string[], uiStringIgnores?: string[] }} options
 *   uiStringFiles: globs where user-facing strings must go through i18n.
 */
export function himsReact({ rootDir, uiStringFiles, uiStringIgnores = [] }) {
  return defineConfig(
    ...hims({ rootDir }),
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: { globals: { ...globals.browser } },
      plugins: { 'react-hooks': reactHooks, hims: himsUi },
      rules: {
        ...reactHooks.configs.flat.recommended.rules,
        // We don't run the React Compiler; TanStack Table/Virtual and RHF are flagged as
        // "incompatible" purely for memoisation, which is irrelevant without the compiler.
        'react-hooks/incompatible-library': 'off',
        'hims/no-raw-colours': 'error',
      },
    },
    {
      files: uiStringFiles,
      ignores: ['**/*.spec.{ts,tsx}', '**/*.stories.tsx', ...uiStringIgnores],
      rules: { 'hims/no-literal-ui-strings': 'error' },
    },
  );
}
