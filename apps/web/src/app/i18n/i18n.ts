import { uiMessagesEn, uiMessagesUr } from '@hims/ui';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './locales/en';
import { ur } from './locales/ur';

/**
 * i18next was chosen over Lingui: runtime catalogues (no compile/macro step under Vite 8),
 * built-in RTL direction lookup, namespaces for the ui kit, and resources can be added at runtime
 * (master metadata labels today, tenant overrides later). Keys are flat ("table.rowsPerPage"),
 * so keySeparator is off.
 */
export const LANGUAGES = ['en', 'ur'] as const;
export type Language = (typeof LANGUAGES)[number];

const STORAGE_KEY = 'hims.language';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

function storedLanguage(): Language {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isLanguage(v) ? v : 'en';
  } catch {
    return 'en';
  }
}

export const i18n = i18next.createInstance();

/** Urdu is right-to-left: <html dir> flips the whole layout (logical CSS properties). */
function applyToDocument(lng: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lng;
  document.documentElement.dir = i18n.dir(lng);
}

i18n.on('languageChanged', applyToDocument);

void i18n.use(initReactI18next).init({
  lng: storedLanguage(),
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
  initAsync: false,
});
applyToDocument(i18n.language);

export function setLanguage(lng: Language): void {
  void i18n.changeLanguage(lng);
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // storage blocked: choice lasts for this page only
  }
}

/**
 * Locale used for numbers/dates: the tenant's region with the user's language, e.g. tenant
 * "en-PK" + Urdu → "ur-PK" (Urdu month names, Pakistani grouping), tenant "en-PK" + English → "en-PK".
 */
export function formatLocaleFor(language: Language, tenantLocale: string): string {
  const region = new Intl.Locale(tenantLocale).region;
  return region ? `${language}-${region}` : language;
}
