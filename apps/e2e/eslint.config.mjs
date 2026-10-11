import { hims } from '@hims/config/eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  // Playwright's generated HTML report and failure artifacts are not source.
  { ignores: ['playwright-report/**', 'test-results/**'] },
  ...hims({ rootDir: import.meta.dirname }),
);
