import { himsReact } from '@hims/ui/eslint-react';

export default himsReact({
  rootDir: import.meta.dirname,
  // User-facing text in the app shell and every feature goes through i18n (F0-UI-06).
  uiStringFiles: ['src/app/**/*.tsx', 'src/features/**/*.tsx'],
});
