import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';

import { importBoundaries } from './import-boundaries.mjs';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser: tseslint.parser, ecmaVersion: 'latest', sourceType: 'module' },
});

const web = '/repo/apps/web/src';
const inFeatureA = `${web}/features/patient-registration/components/form.tsx`;

ruleTester.run('hims/import-boundaries', importBoundaries, {
  valid: [
    // Another feature through its public entry, relatively or via the app alias.
    { filename: inFeatureA, code: "import { x } from '../../billing';" },
    { filename: inFeatureA, code: "import { x } from '../../billing/index.js';" },
    { filename: inFeatureA, code: "import { x } from '@/features/billing';" },
    // Deep imports inside the same feature are its own business.
    { filename: inFeatureA, code: "import { useForm } from '../hooks/use-form';" },
    { filename: inFeatureA, code: "import { api } from '@/features/patient-registration/api';" },
    // Outside features/, and workspace packages through their exports.
    { filename: `${web}/app/router.tsx`, code: "import { routes } from '../features/billing';" },
    { filename: inFeatureA, code: "import { Button } from '@hims/ui';" },
    { filename: inFeatureA, code: "import { hims } from '@hims/config/eslint';" },
    // Bare npm paths that merely contain "features/" are not ours.
    { filename: inFeatureA, code: "import 'core-js/features/array/at';" },
    // Every import form is fine when it targets a public entry or the same feature.
    { filename: inFeatureA, code: 'const m = await import(`../../billing`);' },
    { filename: inFeatureA, code: "import billing = require('../../billing');" },
    { filename: inFeatureA, code: "type T = import('../hooks/use-form').Hook;" },
    { filename: inFeatureA, code: "const b = require('../../billing');" },
    { filename: inFeatureA, code: "vi.mock('../hooks/use-form');" },
    // Dynamic template literals can't be checked statically; other calls are not imports.
    { filename: inFeatureA, code: 'const m = await import(`../../${name}/internal`);' },
    { filename: inFeatureA, code: "logger.mock('../../billing/internal');" },
    // Relative paths that stay inside the workspace.
    { filename: `${web}/app/router.tsx`, code: "import { env } from '../../vite.config';" },
  ],
  invalid: [
    {
      filename: inFeatureA,
      code: "import { InvoiceRow } from '../../billing/components/invoice-row';",
      errors: [
        {
          messageId: 'feature',
          data: { feature: 'billing', specifier: '../../billing/components/invoice-row' },
        },
      ],
    },
    {
      filename: inFeatureA,
      code: "import type { Invoice } from '@/features/billing/api';",
      errors: [{ messageId: 'feature' }],
    },
    {
      // The app shell must use the public entry too.
      filename: `${web}/app/router.tsx`,
      code: "export { billingRoutes } from '../features/billing/routes';",
      errors: [{ messageId: 'feature' }],
    },
    {
      filename: '/repo/apps/api/src/features/billing/billing.service.ts',
      code: "const repo = await import('../patients/patients.repository');",
      errors: [
        {
          messageId: 'feature',
          data: { feature: 'patients', specifier: '../patients/patients.repository' },
        },
      ],
    },
    {
      filename: inFeatureA,
      code: "export * from '@hims/ui/src/button';",
      errors: [{ messageId: 'package' }],
    },
    {
      filename: inFeatureA,
      code: "import { schema } from '@hims/contracts/dist/patients.js';",
      errors: [{ messageId: 'package' }],
    },
    // Other import forms reaching into another feature.
    {
      filename: inFeatureA,
      code: 'const m = await import(`../../billing/internal`);',
      errors: [{ messageId: 'feature' }],
    },
    {
      filename: '/repo/apps/api/src/features/billing/billing.service.ts',
      code: "import repo = require('../patients/patients.repository');",
      errors: [{ messageId: 'feature' }],
    },
    {
      filename: inFeatureA,
      code: "type Invoice = import('../../billing/api').Invoice;",
      errors: [{ messageId: 'feature' }],
    },
    {
      filename: '/repo/apps/api/src/features/billing/billing.service.ts',
      code: "const repo = require('../patients/patients.repository');",
      errors: [{ messageId: 'feature' }],
    },
    {
      filename: '/repo/apps/api/src/features/billing/billing.service.spec.ts',
      code: "vi.mock('../patients/patients.repository');",
      errors: [{ messageId: 'feature' }],
    },
    {
      filename: '/repo/apps/api/src/features/billing/billing.service.spec.ts',
      code: "const real = await vi.importActual('../patients/patients.repository');",
      errors: [{ messageId: 'feature' }],
    },
    // Relative paths that leave the importing workspace (apps/* or packages/*).
    {
      filename: inFeatureA,
      code: "import { Button } from '../../../../../../packages/ui/src/button';",
      errors: [{ messageId: 'workspace' }],
    },
    {
      filename: '/repo/packages/db/src/client.ts',
      code: "import { API_VERSION } from '../../contracts/src/index.js';",
      errors: [{ messageId: 'workspace' }],
    },
  ],
});
