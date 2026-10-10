import { uiMessagesEn, uiMessagesUr } from '@hims/ui';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './locales/en';
import { ur } from './locales/ur';

/**
 * i18next was chosen over Lingui: runtime catalogues (no compile/macro step under Vite 8),
 * built-in RTL direction lookup, namespaces for the ui kit, and tenant-overridable resources can
 * be added at runtime later. Keys are flat ("table.rowsPerPage"), so keySeparator is off.
 */
export const LANGUAGES = ['en', 'ur'] as const;
export type Language = (typeof LANGUAGES)[number];

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: LANGUAGES,
  ns: ['app', 'ui'],
  defaultNS: 'app',
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false }, // React already escapes
  resources: {
    en: { app: en, ui: uiMessagesEn },
    ur: { app: ur, ui: uiMessagesUr },
  },
  returnNull: false,
});

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}
