import { expect, test } from '../fixtures.js';

test.describe('app shell', () => {
  test('loads the home screen inside the shell for the signed-in user', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Welcome, Demo Admin' }),
    ).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('data-status', 'active');
    await expect(page.getByText('Demo Hospital A')).toBeVisible();
  });

  test('switches branch from the header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('active-branch')).toHaveText('Main Campus');
    await page.getByRole('button', { name: /Change branch/ }).click();
    await page.getByRole('menuitemradio', { name: 'City Clinic' }).click();
    await expect(page.getByTestId('active-branch')).toHaveText('City Clinic');
  });

  test('switches to dark theme from the user menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitemradio', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('shows not-found for an unknown URL and links back home', async ({ page }) => {
    await page.goto('/no-such-screen');
    await expect(page.getByText('Page not found')).toBeVisible();
    await page.getByRole('link', { name: 'Go to home' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('keyboard users can skip straight to the content', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
  });
});
