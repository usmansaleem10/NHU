import { defineConfig } from 'vitest/config';

// Logic specs run in node; component specs opt into jsdom with `// @vitest-environment jsdom`.
// Switch to the shared preset from @hims/config once tooling publishes it.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.{ts,tsx}'],
    environment: 'node',
  },
});
