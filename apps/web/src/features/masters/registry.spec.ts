import { describe, expect, it } from 'vitest';

import { i18n } from '../../app/i18n/i18n';
import { masterKey, MASTERS } from './registry';

describe('master registry', () => {
  it('uses plural kebab-case ids, as the API resource path requires', () => {
    for (const m of MASTERS) expect(m.id).toMatch(/^[a-z]+(-[a-z]+)*s$/);
  });

  it('registers metadata labels as translations (Urdu falls back to English)', () => {
    for (const m of MASTERS) {
      expect(i18n.t(masterKey(m.id, 'title') as 'app.name', { lng: 'en' })).toBe(m.labels.en.title);
      const ur = m.labels.ur?.title ?? m.labels.en.title;
      expect(i18n.t(masterKey(m.id, 'title') as 'app.name', { lng: 'ur' })).toBe(ur);
    }
  });
});
