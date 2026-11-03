import { expect, test } from '../fixtures.js';

test.describe('shared patient search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/foundation/patient-search');
    await expect(page.getByRole('heading', { level: 1, name: 'Patient search' })).toBeVisible();
  });

  test('masks CNIC as 5-7-1, finds the patient and keeps it out of the URL', async ({ page }) => {
    await page.getByLabel('Search by').selectOption('cnic');
    const input = page.getByRole('textbox', { name: 'CNIC' });
    await input.pressSequentially('3520200000011');
    await expect(input).toHaveValue('35202-0000001-1');
    await input.press('Enter');
    await expect(page.getByText('Patients found: 1')).toBeVisible();
    await page.getByRole('button', { name: 'Select Demo Patient 00001' }).click();
    await expect(page.getByTestId('selected-patient')).toHaveText('Demo Patient 00001');
    // Results show a masked CNIC; the raw identifier never reaches the address bar.
    await expect(page.getByText(/35202-\*{7}-1/)).toBeVisible();
    expect(page.url()).not.toContain('35202');
  });

  test('blocks an incomplete CNIC before calling the server', async ({ page }) => {
    await page.getByLabel('Search by').selectOption('cnic');
    await page.getByRole('textbox', { name: 'CNIC' }).fill('35202-12');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('alert')).toHaveText('CNIC must have 13 digits (5-7-1).');
    await expect(page.getByRole('textbox', { name: 'CNIC' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  test('finds by name and by +92 phone number', async ({ page }) => {
    await page.getByLabel('Search by').selectOption('name');
    await page.getByRole('textbox', { name: 'Name' }).fill('patient 0001');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('Patients found: 10')).toBeVisible();

    await page.getByLabel('Search by').selectOption('phone');
    await page.getByRole('textbox', { name: 'Phone' }).fill('+92 300 0000042');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('button', { name: 'Select Demo Patient 00042' })).toBeVisible();
  });

  test('shows the empty state when nothing matches', async ({ page }) => {
    await page.getByRole('textbox', { name: 'MRN' }).fill('mr-999999');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('No patient matches this search.')).toBeVisible();
  });
});

test.describe('patient search permissions', () => {
  test.use({ persona: 'nurse' });

  test('a nurse can search patients but has no data-table screen', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'Patient search' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Data table' })).toHaveCount(0);
    await page.goto('/foundation/data-table');
    await expect(page.getByText('You do not have access')).toBeVisible();
  });
});
