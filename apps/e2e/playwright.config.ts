import { resolve } from 'node:path';

import { defineConfig, devices } from '@playwright/test';

/**
 * HIMS E2E harness (F0-REPO-09). One folder per feature (`shell/`, `data-table/`, ...), files
 * named `*.e2e.ts`. Boots the PRODUCTION build of apps/web with `vite preview`, so code
 * splitting and the bundle budget are exercised exactly as shipped.
 *
 * Seeded tenants: demo-a / demo-b (demo-a.localhost, demo-b.localhost) arrive with F0-TEN + the
 * API. Until then the web app runs on in-memory dev fixtures and suites pick a persona through
 * the `persona` fixture (see fixtures.ts). When the API lands, add it to `webServer` and point
 * baseURL at http://demo-a.localhost:4173.
 */
const repoRoot = resolve(import.meta.dirname, '../..');
const port = 4173;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 2 } : {}),
  reporter: isCI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${String(port)}`,
    // Artifacts for CI upload (playwright-report/, test-results/): only kept when a test fails.
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    colorScheme: 'light',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } },
      testIgnore: '**/*.tablet.e2e.ts',
    },
    // Ward/bedside tablets (AGENTS.md "Screen design"): drawer navigation, touch-sized targets.
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true },
      testMatch: '**/*.tablet.e2e.ts',
    },
  ],
  webServer: {
    command: 'pnpm --filter "@hims/web..." build && pnpm --filter @hims/web preview',
    cwd: repoRoot,
    url: `http://localhost:${String(port)}`,
    reuseExistingServer: !isCI,
    timeout: 240_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
