import { test as base, expect } from '@playwright/test';

/**
 * Dev-fixture personas served by apps/web/src/dev-fixtures/session.ts until the API exists:
 *  - admin: every Phase 0 permission, all modules licensed
 *  - nurse: home, patient search and masters (view only)
 *  - unlicensed: every permission, but the tenant has not licensed the masters module
 */
export type Persona = 'admin' | 'nurse' | 'unlicensed';

export const test = base.extend<{ persona: Persona; language: 'en' | 'ur' }>({
  persona: ['admin', { option: true }],
  language: ['en', { option: true }],
  page: async ({ page, persona, language }, use) => {
    await page.addInitScript(
      ([p, l]) => {
        localStorage.setItem('hims.dev.persona', p);
        // Only the initial language: a user's switch must survive reloads within the test.
        if (localStorage.getItem('hims.language') === null)
          localStorage.setItem('hims.language', l);
      },
      [persona, language] as const,
    );
    await use(page);
  },
});

export { expect };
