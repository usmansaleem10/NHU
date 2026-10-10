import { defineConfig } from 'vitest/config';

// Pure-logic specs run in node; component specs opt into jsdom with a `@vitest-environment` pragma.
// Switch to the shared preset from @hims/config once tooling publishes it.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.{ts,tsx}'],
    environment: 'node',
  },
});
