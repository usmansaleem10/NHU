import { expect, test } from '../fixtures.js';

test.describe('i18n and tenant formatting', () => {
  test('switches to Urdu: right-to-left layout, translated shell, persisted', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await page.getByRole('button', { name: 'Language' }).click();
    await page.getByRole('menuitemradio', { name: 'اردو' }).click();

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ur');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('خوش آمدید، Demo Admin');
    const nav = page.getByRole('navigation', { name: 'مرکزی نیویگیشن' });
    await expect(nav.getByRole('link', { name: 'ہوم' })).toBeVisible();
    // Untranslated keys fall back to English rather than showing raw keys.
    await expect(
      nav.getByRole('link', { name: 'Form kit' }).or(nav.getByRole('link', { name: 'فارم کٹ' })),
    ).toBeVisible();

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await page.getByRole('button', { name: 'زبان' }).click();
    await page.getByRole('menuitemradio', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome, Demo Admin');
  });

  test('formats money and dates per tenant settings in English', async ({ page }) => {
    await page.goto('/foundation/data-table');
    await page.getByRole('searchbox').fill('MR-000001');
    const row = page
      .getByRole('table', { name: 'Demo patients' })
      .locator('tbody tr[data-index]')
      .first();
    await expect(row.locator('td').first()).toHaveText('MR-000001');
    // PKR always with paisa; dates in the tenant zone (Asia/Karachi), en-PK style.
    await expect(row.locator('td').nth(6)).toHaveText(/^Rs\s[\d,]+\.\d{2}$/);
    await expect(row.locator('td').nth(4)).toHaveText(/^\d{1,2}-[A-Z][a-z]{2}-2026/);
  });

  test.describe('in Urdu', () => {
    test.use({ language: 'ur' });

    test('formats dates with Urdu month names and keeps PKR amounts', async ({ page }) => {
      await page.goto('/foundation/data-table');
      await page.getByRole('searchbox').fill('MR-000001');
      const row = page.getByRole('table').locator('tbody tr[data-index]').first();
      await expect(row.locator('td').first()).toHaveText('MR-000001');
      await expect(row.locator('td').nth(4)).toHaveText(/[؀-ۿ]/);
      await expect(row.locator('td').nth(6)).toHaveText(/Rs\s[\d,]+\.\d{2}/);
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });
  });
});
