// Local Vitest config until the shared @hims/config/vitest preset lands (TOOLING track).
// unit:        *.spec.ts      pure logic, no Docker
// integration: *.int.spec.ts  real Postgres 17 via Testcontainers (AGENTS.md testing rule 5)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
          exclude: ['src/**/*.int.spec.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          include: ['src/**/*.int.spec.ts'],
          // Container start + migrations dominate; each file owns one container.
          hookTimeout: 120_000,
          testTimeout: 60_000,
        },
      },
    ],
  },
});
