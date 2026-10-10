// Local Vitest config until the shared @hims/config/vitest preset lands (TOOLING track).
// SWC transpiles the specs so NestJS gets emitDecoratorMetadata (esbuild cannot emit it).
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.spec.ts'],
    exclude: ['src/**/*.int.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts'],
    },
  },
});
