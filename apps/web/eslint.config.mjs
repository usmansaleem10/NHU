import { himsReact } from '@hims/ui/eslint-react';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  // Build output outside dist/: the E2E fixture build and extracted source maps.
  { ignores: ['dist-e2e/**', 'dist-sourcemaps/**'] },
  ...himsReact({
    rootDir: import.meta.dirname,
    // User-facing text in the app shell and every feature goes through i18n (F0-UI-06).
    uiStringFiles: ['src/app/**/*.tsx', 'src/features/**/*.tsx'],
  }),
  // Dev fixtures stand in for tenant config, whose theme overrides are colour values by design.
  { files: ['src/dev-fixtures/**'], rules: { 'hims/no-raw-colours': 'off' } },
);
