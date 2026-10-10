// Shared Vitest preset (F0-REPO-06). A workspace's vitest.config.ts is one line:
//
//   export { default } from '@hims/config/vitest';
//
// or, when it needs more (plugins, jsdom), `export default vitestConfig({ ... })`.
// The workspace also lists `vitest` and `@vitest/coverage-v8` as devDependencies and uses:
//   "test":     "vitest run --project unit --coverage"   (pnpm test)
//   "test:int": "vitest run --project integration"       (pnpm test:int, Testcontainers)
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';

const SPEC = 'src/**/*.spec.{ts,tsx}';
const INT_SPEC = 'src/**/*.int.spec.{ts,tsx}';

/**
 * @param {import('vitest/config').ViteUserConfig} [overrides] merged on top (arrays concatenate)
 * @returns {import('vitest/config').ViteUserConfig}
 */
export function vitestConfig(overrides = {}) {
  const base = defineConfig({
    test: {
      // Coverage runs for the unit project only (`--coverage` in the `test` script), so an
      // integration run never overwrites coverage/ with numbers CI would compare against.
      coverage: {
        provider: 'v8',
        // Listing sources (not just files a test loaded) makes untested files show as 0%.
        include: ['src/**/*.{ts,tsx,mts,mjs}'],
        exclude: ['src/**/*.spec.{ts,tsx}', 'src/**/*.d.ts'],
        // text-summary: CI log. json-summary + json: PR comment and the per-file gate.
        // lcov: editors and any external service.
        reporter: ['text-summary', 'json-summary', 'json', 'lcov'],
        reportsDirectory: 'coverage',
        reportOnFailure: true,
      },
      projects: [
        {
          extends: true,
          test: { name: 'unit', include: [SPEC], exclude: [...configDefaults.exclude, INT_SPEC] },
        },
        {
          extends: true,
          test: {
            name: 'integration',
            include: [INT_SPEC],
            // Container start + migrations dominate an integration file.
            hookTimeout: 120_000,
            testTimeout: 60_000,
          },
        },
      ],
    },
  });
  return mergeConfig(base, overrides);
}

export default vitestConfig();
