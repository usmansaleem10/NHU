import { defineConfig } from 'eslint/config';

import { himsReact } from './eslint-react.mjs';

export default defineConfig(
  ...himsReact({ rootDir: import.meta.dirname, uiStringFiles: ['src/**/*.tsx'] }),
  // The theme module and its tests handle colour values by design (tenant overrides).
  { files: ['src/theme/**'], rules: { 'hims/no-raw-colours': 'off' } },
  // The lint rules' own tests are full of the patterns they forbid.
  { files: ['src/lint/**'], rules: { 'hims/no-raw-colours': 'off' } },
);
