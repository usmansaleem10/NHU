import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures.js';

/** Options of the department combobox only (native <select> options also have role=option). */
const listOptions = (page: Page) => page.getByRole('listbox').getByRole('option');

async function pickDepartment(page: Page, search: string, option: string) {
  const combo = page.getByRole('combobox', { name: 'Department' });
  await combo.fill(search);
  await page.getByRole('option', { name: new RegExp(option) }).click();
  await expect(combo).toHaveValue(option);
}

async function fillValid(
  page: Page,
  { email = 'new.person@example.com', department = '001' } = {},
) {
  await page.getByLabel('Full name').fill('Ayesha Khan');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mobile number').fill('03001234567');
  await page.getByLabel('Gender').selectOption('female');
  await page.getByLabel('Date of birth').fill('1990-05-17');
  await page.getByLabel('Appointment').fill('2026-10-20T10:30');
  await pickDepartment(page, `Department ${department}`, `Department ${department}`);
  await page.getByLabel('Patient consent recorded').check();
}

test.describe('form kit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/foundation/forms');
    await expect(page.getByRole('heading', { level: 1, name: 'Form kit' })).toBeVisible();
  });

  test('shows client validation next to each field and focuses the first error', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('alert').first()).toContainText(
      'Please fix the highlighted fields.',
    );
    await expect(page.getByText('Enter at least 2 characters.')).toBeVisible();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(page.getByText('Consent must be recorded before saving.')).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeFocused();
    await expect(page.getByLabel('Full name')).toHaveAttribute('aria-invalid', 'true');
  });

  test('rejects a future date of birth', async ({ page }) => {
    await page.getByLabel('Date of birth').fill('2999-01-01');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Date cannot be in the future.')).toBeVisible();
  });

  test('typeahead never preloads and searches the server after 2 characters', async ({ page }) => {
    const combo = page.getByRole('combobox', { name: 'Department' });
    await combo.focus();
    await expect(page.getByText('Type at least 2 characters to search')).toBeVisible();
    await expect(listOptions(page)).toHaveCount(0);
    await combo.fill('Department 1');
    await expect(listOptions(page).first()).toBeVisible();
    // The server returns at most the requested page (20), never all 300 departments.
    expect(await listOptions(page).count()).toBeLessThanOrEqual(20);
    await combo.press('ArrowDown');
    await combo.press('Enter');
    await expect(combo).toHaveValue(/Department 1\d*/);
  });

  test('maps a server field error (problem+json) onto the email field', async ({ page }) => {
    await fillValid(page, { email: 'taken@example.com' });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('This email is already registered.')).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Email')).toBeFocused();
  });

  test('shows server errors for non-form fields at the top of the form', async ({ page }) => {
    await fillValid(page, { department: '013' });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('alert').first()).toContainText(
      'The selected branch is closed for new registrations.',
    );
  });

  test('saves a valid form and echoes dates in the tenant format', async ({ page }) => {
    await fillValid(page);
    // Helper line under the date shows the tenant-formatted value (en-PK).
    await expect(page.getByText(/17.May.1990/)).toBeVisible();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved. Reference' })).toBeVisible();
    await expect(page.getByLabel('Full name')).toHaveValue('');
  });
});
