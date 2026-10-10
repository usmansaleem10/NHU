import { expect, test } from '../fixtures.js';

test('tablet: navigation lives in a drawer that closes after choosing a screen', async ({
  page,
}) => {
  await page.goto('/');
  const sidebarNav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(sidebarNav).toBeHidden();

  await page.getByRole('button', { name: 'Open navigation' }).click();
  const drawer = page.getByRole('dialog', { name: 'Main navigation' });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('link', { name: 'Home' }).click();
  await expect(drawer).toBeHidden();
});
