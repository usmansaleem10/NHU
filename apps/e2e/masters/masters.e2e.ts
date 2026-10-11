import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures.js';

const table = (page: Page) => page.getByRole('table', { name: 'Staff types' });
const settled = (page: Page) => expect(table(page)).toHaveAttribute('aria-busy', 'false');

test.describe('metadata-driven master (staff types) as admin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Master data' })
      .click();
    await page.getByRole('link', { name: /Staff types/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Staff types' })).toBeVisible();
    await settled(page);
  });

  test('lists records from the server, sorted by code, with search', async ({ page }) => {
    await expect(page.getByText('1–6 of 6')).toBeVisible();
    await expect(
      table(page).locator('tbody tr[data-index]').first().locator('td').first(),
    ).toHaveText('ADMIN');
    await page.getByRole('searchbox', { name: 'Search Staff types' }).fill('radio');
    await expect(page.getByText('1–1 of 1')).toBeVisible();
    await expect(
      table(page).getByRole('cell', { name: 'Radiology Staff', exact: true }),
    ).toBeVisible();
  });

  test('adds a record through the generated dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Add staff type' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add staff type' });
    await dialog.getByLabel('Code').fill('lab');
    await dialog.getByLabel('Name').fill('Laboratory Staff');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole('status').filter({ hasText: '“Laboratory Staff” saved.' }),
    ).toBeVisible();
    await settled(page);
    await expect(table(page).getByRole('cell', { name: 'LAB', exact: true })).toBeVisible();
    await expect(page.getByText('1–7 of 7')).toBeVisible();
  });

  test('validates the code on the client before calling the server', async ({ page }) => {
    await page.getByRole('button', { name: 'Add staff type' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add staff type' });
    await dialog.getByLabel('Code').fill('has space');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog.getByText('Use 2–20 upper-case letters, digits, - or _.')).toBeVisible();
    await expect(dialog.getByText('Enter a name of at least 2 characters.')).toBeVisible();
  });

  test('maps the server duplicate-code error onto the code field', async ({ page }) => {
    await page.getByRole('button', { name: 'Add staff type' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add staff type' });
    await dialog.getByLabel('Code').fill('DOC');
    await dialog.getByLabel('Name').fill('Another doctor type');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog.getByText('This code is already in use.')).toBeVisible();
    await expect(dialog.getByLabel('Code')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog).toBeVisible();
  });

  test('edits a record; its code is read-only', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit Doctor' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit staff type' });
    await expect(dialog.getByLabel('Code')).toHaveValue('DOC');
    await expect(dialog.getByLabel('Code')).toHaveAttribute('readonly', '');
    await dialog.getByLabel('Name').fill('Doctors (all grades)');
    await dialog.getByLabel('Status').selectOption('inactive');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();
    await settled(page);
    const row = table(page).getByRole('row', { name: /Doctors \(all grades\)/ });
    await expect(row).toContainText('Inactive');
  });
});

test.describe('master permissions', () => {
  test.use({ persona: 'nurse' });

  test('a view-only user sees the list without add or edit actions', async ({ page }) => {
    await page.goto('/masters/staff-types');
    await settled(page);
    await expect(page.getByText('1–6 of 6')).toBeVisible();
    await expect(page.getByRole('button', { name: /Add staff type/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Edit / })).toHaveCount(0);
  });
});

test.describe('unlicensed module', () => {
  test.use({ persona: 'unlicensed' });

  test('hides master data from navigation and blocks the URL', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Master data' })).toHaveCount(0);
    await page.goto('/masters/staff-types');
    await expect(page.getByText('You do not have access')).toBeVisible();
  });
});
