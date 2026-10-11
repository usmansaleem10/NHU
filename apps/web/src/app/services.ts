/**
 * The single wiring point between screens and their data sources. Every entry is an interface;
 * today the implementations are DEV FIXTURES (src/dev-fixtures). When F0-API's typed contracts
 * client lands, swap each fixture for the API-backed implementation here — screens don't change.
 */
import {
  createStorageSavedViewsStore,
  type FetchPage,
  type SavedViewsStore,
  type TypeaheadSearch,
} from '@hims/ui';

import {
  searchDepartments,
  submitDemoRegistration,
  type DemoRegistration,
} from '../dev-fixtures/demo-form';
import { createDemoPatientSource, type DemoPatient } from '../dev-fixtures/demo-patients';
import { createDevSessionSource } from '../dev-fixtures/session';
import type { SessionSource } from './session/types';

export interface AppServices {
  session: SessionSource;
  /** List endpoint for the data-table reference screen (GET /api/v1/patients?page&size&sort&q&f.*). */
  demoPatients: FetchPage<DemoPatient>;
  /** Per-user saved table views. Browser storage now; a user-preferences endpoint later. */
  savedViews: SavedViewsStore;
  /** Typeahead endpoint (GET /api/v1/departments?search&limit), at most 50 results. */
  searchDepartments: TypeaheadSearch;
  /** Form-kit reference submit; throws ProblemError (problem+json) on validation failure. */
  submitDemoRegistration: (input: DemoRegistration) => Promise<{ id: string }>;
}

function browserStorage(): Storage {
  try {
    return window.localStorage;
  } catch {
    // Storage blocked (private mode policies): keep views for this page only.
    const data = new Map<string, string>();
    return {
      get length() {
        return data.size;
      },
      clear: () => {
        data.clear();
      },
      getItem: (k) => data.get(k) ?? null,
      key: (i) => [...data.keys()][i] ?? null,
      removeItem: (k) => {
        data.delete(k);
      },
      setItem: (k, v) => {
        data.set(k, v);
      },
    };
  }
}

export const services: AppServices = {
  session: createDevSessionSource(),
  demoPatients: createDemoPatientSource(),
  savedViews: createStorageSavedViewsStore(browserStorage()),
  searchDepartments,
  submitDemoRegistration,
};
