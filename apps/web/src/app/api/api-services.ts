import {
  createStorageSavedViewsStore,
  type DataPage,
  type PatientSearchResult,
  type TableQuery,
  type TypeaheadOption,
} from '@hims/ui';

import type { DemoPatient } from '../../features/foundation';
import type { MasterDataSource, MasterRecord } from '../../features/masters';
import type { AppServices } from '../services';
import type { Session } from '../session/types';
import { requestJson } from './http';

/**
 * Production wiring: every service talks to the HIMS API. Until F0-API publishes the generated
 * contracts client these are thin `requestJson` calls against the agreed routes; responses are
 * cast at this single edge and must be replaced by the contract's Zod parsing when it lands.
 */
/** Query string for non-personal reference lists (masters): page, size, sort, q, f.<col>. */
function listParams(query: TableQuery): string {
  const params = new URLSearchParams({
    page: String(query.page + 1),
    size: String(query.pageSize),
  });
  if (query.sort) params.set('sort', `${query.sort.desc ? '-' : ''}${query.sort.id}`);
  if (query.search) params.set('q', query.search);
  for (const [id, value] of Object.entries(query.filters)) params.set(`f.${id}`, value);
  return params.toString();
}

const get = <T>(path: string, signal?: AbortSignal) =>
  requestJson(path, signal ? { signal } : {}) as Promise<T>;
const send = <T>(method: 'POST' | 'PUT', path: string, body: unknown, headers?: HeadersInit) =>
  requestJson(path, {
    method,
    body: JSON.stringify(body),
    ...(headers ? { headers } : {}),
  }) as Promise<T>;

function masterSource(id: string): MasterDataSource {
  return {
    list: (query, signal) => get<DataPage<MasterRecord>>(`/${id}?${listParams(query)}`, signal),
    create: (input) => send<MasterRecord>('POST', `/${id}`, input),
    update: (recordId, input, version) =>
      send<MasterRecord>('PUT', `/${id}/${encodeURIComponent(recordId)}`, input, {
        'If-Match': String(version),
      }),
  };
}

export function createApiServices(storage: Storage): AppServices {
  return {
    session: {
      load: (signal) => get<Session>('/session', signal),
      switchBranch: (branchId) => send<Session>('POST', '/session/branch', { branchId }),
    },
    // Patient lists can be searched by name/MRN, i.e. personal data: the query goes in a POST
    // body so it never lands in URLs or access logs (AGENTS.md rule 10).
    demoPatients: (query, signal) =>
      requestJson('/patients/query', {
        method: 'POST',
        body: JSON.stringify(query),
        ...(signal ? { signal } : {}),
      }) as Promise<DataPage<DemoPatient>>,
    savedViews: createStorageSavedViewsStore(storage),
    searchDepartments: (query, { signal, limit }) =>
      get<TypeaheadOption[]>(
        `/departments?${new URLSearchParams({ search: query, limit: String(limit) }).toString()}`,
        signal,
      ),
    submitDemoRegistration: (input) => send<{ id: string }>('POST', '/demo-registrations', input),
    masters: masterSource,
    // Identifiers travel in the body, never in a URL (AGENTS.md rule 10).
    searchPatients: (query, signal) =>
      requestJson('/patients/search', {
        method: 'POST',
        body: JSON.stringify(query),
        signal,
      }) as Promise<PatientSearchResult[]>,
  };
}
