import type { uiMessagesEn } from '@hims/ui';
import 'i18next';

import type { en } from './locales/en';

// Typed keys: t('missing.key') is a compile error, so the build fails on a typo.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'app';
    keySeparator: false;
    nsSeparator: false;
    resources: { app: typeof en; ui: typeof uiMessagesEn };
  }
}
