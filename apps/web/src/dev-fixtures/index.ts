/**
 * DEV FIXTURES entry point. Loaded only through the dynamic import in app/services.ts when
 * `import.meta.env.DEV` or VITE_DEV_FIXTURES=true, so production bundles never contain it
 * (scripts/check-no-dev-fixtures.mjs fails the build if they do).
 */
import { createStorageSavedViewsStore } from '@hims/ui';

import type { AppServices } from '../app/services';
import { searchDepartments, submitDemoRegistration } from './demo-form';
import { createDemoPatientSource } from './demo-patients';
import { createDevMasterSources } from './masters';
import { createPatientSearch } from './patient-search';
import { createDevSessionSource } from './session';

export function createDevServices(storage: Storage): AppServices {
  return {
    session: createDevSessionSource(),
    demoPatients: createDemoPatientSource(),
    savedViews: createStorageSavedViewsStore(storage),
    searchDepartments,
    submitDemoRegistration,
    masters: createDevMasterSources(),
    searchPatients: createPatientSearch(),
  };
}
