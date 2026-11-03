// Shared preset. Pure-logic specs run in node; component specs opt into jsdom with a
// `// @vitest-environment jsdom` pragma. Ladle stories are catalogue code, not product code.
import { vitestConfig } from '@hims/config/vitest';

export default vitestConfig({ test: { coverage: { exclude: ['src/**/*.stories.tsx'] } } });
