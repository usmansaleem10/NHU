import type { Page } from '@playwright/test';

import { expect, test, type Persona } from '../fixtures.js';

const navLinks = async (page: Page) => {
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible();
  return nav.getByRole('link').allTextContents();
};

const expected: Record<Persona, string[]> = {
  admin: ['Home', 'Data table', 'Form kit', 'Patient search', 'Master data'],
  nurse: ['Home', 'Patient search', 'Master data'],
  unlicensed: ['Home', 'Data table', 'Form kit', 'Patient search'],
};

for (const persona of Object.keys(expected) as Persona[]) {
  test.describe(`navigation as ${persona}`, () => {
    test.use({ persona });

    test('shows exactly the permitted and licensed screens', async ({ page }) => {
      await page.goto('/');
      expect(await navLinks(page)).toEqual(expected[persona]);
    });
  });
}

test.describe('keyboard', () => {
  test('the shell and a screen are operable without a mouse', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const link = page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Form kit' });
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: 'Form kit' })).toBeVisible();
    // Focus moves to the new screen so screen-reader users land on the content.
    await expect(page.locator('main#main')).toBeFocused();

    await page.getByLabel('Full name').focus();
    await page.keyboard.type('Ali Raza');
    await page.keyboard.press('Tab');
    await page.keyboard.type('ali@example.com');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Consent must be recorded before saving.')).toBeVisible();
  });

  test('header menus open and close from the keyboard', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Account menu' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Account menu' })).toBeFocused();
  });
});
