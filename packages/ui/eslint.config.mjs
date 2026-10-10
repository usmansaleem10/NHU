import { defineConfig } from 'eslint/config';

import { himsReact } from './eslint-react.mjs';

export default defineConfig(
  ...himsReact({ rootDir: import.meta.dirname, uiStringFiles: ['src/**/*.tsx'] }),
  // The theme module and its tests handle colour values by design (tenant overrides).
  { files: ['src/theme/**'], rules: { 'hims/no-raw-colours': 'off' } },
);
