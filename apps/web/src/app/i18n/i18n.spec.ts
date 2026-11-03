import { uiMessagesEn, uiMessagesUr } from '@hims/ui';
import { describe, expect, it } from 'vitest';

import { formatLocaleFor, i18n } from './i18n';
import { en } from './locales/en';
import { ur } from './locales/ur';

const placeholders = (s: string) => [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();

describe.each([
  ['app', en as Record<string, string>, ur as Record<string, string | undefined>],
  [
    'ui',
    uiMessagesEn as Record<string, string>,
    uiMessagesUr as Record<string, string | undefined>,
  ],
])('%s catalogue', (_ns, source, urdu) => {
  it('has no Urdu keys that English lacks (stale or misspelt keys)', () => {
    expect(Object.keys(urdu).filter((k) => !(k in source))).toEqual([]);
  });

  it('keeps the same {{placeholders}} in every Urdu translation', () => {
    const mismatched = Object.entries(urdu).filter(
      ([k, v]) =>
        v !== undefined && placeholders(v).join() !== placeholders(source[k] ?? '').join(),
    );
    expect(mismatched).toEqual([]);
  });
});

describe('language', () => {
  it('is right-to-left for Urdu and left-to-right for English', () => {
    expect(i18n.dir('ur')).toBe('rtl');
    expect(i18n.dir('en')).toBe('ltr');
  });

  it('falls back to English for a key Urdu has not translated yet', () => {
    expect(i18n.t('home.foundationTitle', { lng: 'ur' })).toBe(en['home.foundationTitle']);
  });

  it('combines the user language with the tenant region for formatting', () => {
    expect(formatLocaleFor('ur', 'en-PK')).toBe('ur-PK');
    expect(formatLocaleFor('en', 'en-PK')).toBe('en-PK');
    expect(formatLocaleFor('ur', 'en')).toBe('ur');
  });
});
