// Integration specs (*.int.spec.ts): real dependencies such as Postgres via Testcontainers.
import { defineConfig, mergeConfig } from 'vitest/config';

import unit from './vitest.config.mjs';

export default mergeConfig(
  unit,
  defineConfig({ test: { include: ['src/**/*.int.spec.ts'], exclude: [] } }),
);
