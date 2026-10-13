// Shared preset. Logic specs run in node; component specs opt into jsdom with
// `// @vitest-environment jsdom`. Dev fixtures are test doubles, not product code.
import { vitestConfig } from '@hims/config/vitest';

export default vitestConfig({ test: { coverage: { exclude: ['src/dev-fixtures/**'] } } });
