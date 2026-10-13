import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures.js';

const primary = (page: Page) =>
  page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
  );

test.describe('tenant theming (runtime token override)', () => {
  test('a tenant without overrides keeps the default brand', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await primary(page)).toBe('#1e40af');
  });

  test.describe('tenant with a brand theme', () => {
    test.use({ persona: 'unlicensed' }); // Demo Hospital B carries a theme in its config

    test('applies its light override, and its own dark value in dark mode', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await primary(page)).toBe('#0f766e');
      await page.getByRole('button', { name: 'Account menu' }).click();
      await page.getByRole('menuitemradio', { name: 'Dark' }).click();
      await expect(page.locator('html')).toHaveClass(/dark/);
      expect(await primary(page)).toBe('#2dd4bf');
    });
  });
});
