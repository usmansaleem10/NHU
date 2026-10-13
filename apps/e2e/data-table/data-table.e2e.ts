import { readFile } from 'node:fs/promises';

import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures.js';

const table = (page: Page) => page.getByRole('table', { name: 'Demo patients' });
const dataRows = (page: Page) => table(page).locator('tbody tr[data-index]');
const firstCell = (page: Page, col: number) => dataRows(page).first().locator('td').nth(col);
/** Waits until the table has the server's answer for the current query (not the previous page). */
const settled = (page: Page) => expect(table(page)).toHaveAttribute('aria-busy', 'false');

test.describe('data table (server-driven)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/foundation/data-table');
    await expect(page.getByText('1–50 of 10,000')).toBeVisible();
  });

  test('pages through the server and keeps the page in the URL', async ({ page }) => {
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText('51–100 of 10,000')).toBeVisible();
    await expect(page).toHaveURL(/page=2/);
    await expect(firstCell(page, 0)).toHaveText('MR-000051');
    await page.getByRole('button', { name: 'Last page' }).click();
    await expect(page.getByText('9,951–10,000 of 10,000')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  test('sorts on the server: asc, desc, then back to unsorted', async ({ page }) => {
    const nameHeader = table(page).getByRole('columnheader', { name: /Name/ });
    const sortButton = nameHeader.getByRole('button');
    await sortButton.click();
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    await sortButton.click();
    await expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(firstCell(page, 1)).toHaveText('Demo Patient 10000');
    await expect(page).toHaveURL(/sort=-name/);
    await sortButton.click();
    await expect(nameHeader).toHaveAttribute('aria-sort', 'none');
  });

  test('filters by column and by search, resetting to the first page', async ({ page }) => {
    await page.getByRole('button', { name: 'Next page' }).click();
    await page.getByLabel('Filter by Status').selectOption('discharged');
    await expect(page.getByText(/^1–50 of [\d,]+$/)).toBeVisible();
    await expect(page.getByText('1–50 of 10,000')).toBeHidden();
    await settled(page);
    const statuses = await dataRows(page).locator('td:nth-child(6)').allTextContents();
    expect(new Set(statuses)).toEqual(new Set(['Discharged']));

    await page.getByLabel('Filter by Status').selectOption('');
    await page.getByRole('searchbox', { name: 'Search name or MRN' }).fill('MR-000123');
    await expect(page.getByText('1–1 of 1')).toBeVisible();
    await expect(firstCell(page, 0)).toHaveText('MR-000123');
    // Search can identify a patient: it stays in memory, never in the URL (AGENTS.md rule 10).
    expect(page.url()).not.toContain('q=');
    expect(page.url()).not.toContain('MR-000123');
  });

  test('hides a column with the column chooser', async ({ page }) => {
    await expect(table(page).getByRole('columnheader', { name: 'Ward' })).toBeVisible();
    await page.getByRole('button', { name: 'Show or hide columns' }).click();
    await page.getByRole('menuitemcheckbox', { name: 'Ward' }).click();
    await page.keyboard.press('Escape');
    await expect(table(page).getByRole('columnheader', { name: 'Ward' })).toHaveCount(0);
  });

  test('renders 1,000 rows virtualised: only a window of rows is in the DOM', async ({ page }) => {
    await page.getByLabel('Rows per page').selectOption('1000');
    await expect(page.getByText('1–1,000 of 10,000')).toBeVisible();
    await settled(page);
    expect(await dataRows(page).count()).toBeLessThan(80);
    await table(page)
      .locator('xpath=..')
      .evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
    await expect(table(page).getByRole('cell', { name: 'MR-001000' })).toBeVisible();
    expect(await dataRows(page).count()).toBeLessThan(80);
  });

  test('continuous mode streams 10,000 rows page by page without a full load', async ({ page }) => {
    await page.getByRole('button', { name: 'Continuous scroll' }).click();
    await expect(page.getByText(/^200 of 10,000 loaded$/)).toBeVisible();
    const viewport = table(page).locator('xpath=..');
    const loaded = async () =>
      Number(
        (await page.getByText(/of 10,000 loaded$/).textContent())?.split(' ')[0]?.replace(/,/g, ''),
      );
    // Each scroll to the bottom must pull in at least one more server page.
    for (const atLeast of [400, 600, 800]) {
      await viewport.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect.poll(loaded).toBeGreaterThanOrEqual(atLeast);
    }
    expect(await loaded()).toBeLessThan(10_000);
    expect(await dataRows(page).count()).toBeLessThan(80);
  });

  test('saves a view and re-applies it', async ({ page }) => {
    await page.getByLabel('Filter by Ward').selectOption('ICU');
    await expect(page).toHaveURL(/f\.ward=ICU/);
    await page.getByRole('button', { name: 'Saved views' }).click();
    await page.getByRole('menuitem', { name: 'Save current view' }).click();
    await page.getByLabel('View name').fill('ICU only');
    await page.getByRole('button', { name: 'Save' }).click();

    await page.goto('/foundation/data-table');
    await expect(page.getByText('1–50 of 10,000')).toBeVisible();
    await page.getByRole('button', { name: 'Saved views' }).click();
    await page.getByRole('menuitem', { name: 'ICU only' }).click();
    await expect(page).toHaveURL(/f\.ward=ICU/);
    await settled(page);
    const wards = await dataRows(page).locator('td:nth-child(4)').allTextContents();
    expect(new Set(wards)).toEqual(new Set(['ICU']));
  });

  test('saved views never persist search or identifying filters', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search name or MRN' }).fill('Demo Patient 00042');
    await page.getByLabel('Filter by MRN').fill('MR-000042');
    await page.getByLabel('Filter by Ward').selectOption('ICU');
    await expect(page).toHaveURL(/f\.ward=ICU/);
    expect(page.url()).not.toContain('MR-000042');
    await page.getByRole('button', { name: 'Saved views' }).click();
    await page.getByRole('menuitem', { name: 'Save current view' }).click();
    await page.getByLabel('View name').fill('Private check');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    const stored = await page.evaluate(() =>
      JSON.stringify(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])),
    );
    expect(stored).toContain('Private check');
    expect(stored).toContain('ICU');
    expect(stored).not.toContain('Demo Patient 00042');
    expect(stored).not.toContain('MR-000042');
  });

  test('exports the current filtered query as CSV', async ({ page }) => {
    await page.getByLabel('Filter by Ward').selectOption('CCU');
    await expect(page).toHaveURL(/f\.ward=CCU/);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('patients.csv');
    const csv = await readFile(await file.path(), 'utf8');
    const [header, ...lines] = csv
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\r\n');
    expect(header).toBe('MRN,Name,Gender,Ward,Admitted,Status,Balance');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((l) => l.split(',')[3] === 'CCU')).toBe(true);
  });
});

test('startup removes legacy unscoped saved views that could hold search terms', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('hims.views.foundation.patients', '[{"query":{"search":"Ayesha"}}]');
    }
  });
  await page.goto('/foundation/data-table');
  await expect(page.getByText('1–50 of 10,000')).toBeVisible();
  const legacy = await page.evaluate(() => localStorage.getItem('hims.views.foundation.patients'));
  expect(legacy).toBeNull();
});
