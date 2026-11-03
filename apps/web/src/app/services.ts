/**
 * The single wiring point between screens and their data sources. Every entry is an interface.
 * Production builds use the API-backed implementations (app/api/api-services.ts). Dev server and
 * E2E builds (VITE_DEV_FIXTURES=true) load in-memory DEV FIXTURES through a dynamic import that
 * Rollup drops from production bundles. Screens never know which one they got.
 */
import {
  purgeLegacySavedViews,
  type FetchPage,
  type PatientSearchQuery,
  type PatientSearchResult,
  type SavedViewsStore,
  type TypeaheadSearch,
} from '@hims/ui';

import type { DemoPatient, DemoRegistration } from '../features/foundation';
import type { MasterDataSource } from '../features/masters';
import { createApiServices } from './api/api-services';
import type { SessionSource } from './session/types';

export interface AppServices {
  session: SessionSource;
  /** Patient list for the data-table reference screen (POST /api/v1/patients/query). */
  demoPatients: FetchPage<DemoPatient>;
  /** Per-user saved table views. Browser storage now; a user-preferences endpoint later. */
  savedViews: SavedViewsStore;
  /** Typeahead endpoint (GET /api/v1/departments?search&limit), at most 50 results. */
  searchDepartments: TypeaheadSearch;
  /** Form-kit reference submit; throws ProblemError (problem+json) on validation failure. */
  submitDemoRegistration: (input: DemoRegistration) => Promise<{ id: string }>;
  /** Simple-master CRUD per resource id (GET/POST/PUT /api/v1/<id>). */
  masters: (masterId: string) => MasterDataSource;
  /** POST /api/v1/patients/search (identifiers in the body, never the URL). */
  searchPatients: (
    query: PatientSearchQuery,
    signal: AbortSignal,
  ) => Promise<readonly PatientSearchResult[]>;
}

function browserStorage(): Storage {
  try {
    return window.localStorage;
  } catch {
    // Storage blocked (private mode policies): keep data for this page only.
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

/**
 * Filled by initServices() before the first render (main.tsx). Kept as one stable object so call
 * sites read `services.demoPatients(...)` without awaiting anything.
 */
export const services = {} as AppServices;

export async function initServices(): Promise<void> {
  // Both flags are statically replaced at build time, so in a production build this branch is
  // dead code and the dev-fixtures chunk is never emitted (checked by check-no-dev-fixtures).
  const storage = browserStorage();
  // Views saved before tenant/user scoping may hold search terms: drop them once at startup.
  purgeLegacySavedViews(storage);
  if (import.meta.env.DEV || import.meta.env.VITE_DEV_FIXTURES === 'true') {
    const { createDevServices } = await import('../dev-fixtures');
    Object.assign(services, createDevServices(storage));
  } else {
    Object.assign(services, createApiServices(storage));
  }
}
