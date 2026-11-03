// Shared preset (@hims/config/vitest) plus SWC: NestJS needs emitDecoratorMetadata,
// which esbuild cannot emit. .mjs because the lint project service only covers src/.
import { vitestConfig } from '@hims/config/vitest';
import swc from 'unplugin-swc';

export default vitestConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: { coverage: { exclude: ['src/main.ts'] } },
});
