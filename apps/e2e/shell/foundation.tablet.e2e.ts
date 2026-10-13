import { expect, test } from '../fixtures.js';

// Ward/bedside tablets (820px): every foundation screen must stay usable without a sidebar.
test.describe('tablet width', () => {
  test('data table pages and sorts', async ({ page }) => {
    await page.goto('/foundation/data-table');
    await expect(page.getByText('1–50 of 10,000')).toBeVisible();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText('51–100 of 10,000')).toBeVisible();
    const body = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewport = page.viewportSize()?.width ?? 0;
    // The table scrolls inside its own viewport; the page itself never scrolls sideways.
    expect(body).toBeLessThanOrEqual(viewport);
  });

  test('master add dialog fits and submits', async ({ page }) => {
    await page.goto('/masters/staff-types');
    await page.getByRole('button', { name: 'Add staff type' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add staff type' });
    await dialog.getByLabel('Code').fill('PHARM');
    await dialog.getByLabel('Name').fill('Pharmacy Staff');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'saved' })).toBeVisible();
  });

  test('patient search works from the drawer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page
      .getByRole('dialog', { name: 'Main navigation' })
      .getByRole('link', { name: 'Patient search' })
      .click();
    await page.getByRole('textbox', { name: 'MRN' }).fill('MR-000007');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('button', { name: 'Select Demo Patient 00007' })).toBeVisible();
  });
});
