/**
 * DEV FIXTURE — not production data. In-memory MasterDataSource per master id, standing in for
 * GET/POST/PUT /api/v1/<id> until the API exists. Behaves like the server will: server-side
 * filter/sort/page, unique codes (422 on /code), optimistic locking (409 on stale version).
 */
import { ProblemError, type DataPage, type TableQuery } from '@hims/ui';

import type { MasterDataSource, MasterInput, MasterRecord } from '../features/masters';

const SEEDS: Record<string, [code: string, name: string, description: string][]> = {
  // Example values from the legacy screen (docs/spec P04 "Staff type").
  'staff-types': [
    ['PCD', 'PCD Staff', 'Patient care department'],
    ['DOC', 'Doctor', ''],
    ['OT', 'OT Staff', 'Operation theatre'],
    ['ADMIN', 'Admin Staff', ''],
    ['RAD', 'Radiology Staff', ''],
    ['NUR', 'Nursing Staff', ''],
  ],
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

function createSource(masterId: string, latencyMs: number): MasterDataSource {
  let records: MasterRecord[] = (SEEDS[masterId] ?? []).map(([code, name, description], i) => ({
    id: `${masterId}-${String(i + 1)}`,
    code,
    name,
    description,
    status: 'active',
    version: 1,
  }));

  const assertUniqueCode = (code: string, exceptId?: string) => {
    if (records.some((r) => r.code === code && r.id !== exceptId)) {
      throw new ProblemError({
        status: 422,
        title: 'Validation failed',
        errors: [{ pointer: '/code', message: 'masters.server.codeTaken', code: 'duplicate' }],
      });
    }
  };

  return {
    async list(query: TableQuery): Promise<DataPage<MasterRecord>> {
      await wait(latencyMs);
      const q = query.search.trim().toLowerCase();
      let rows = records.filter(
        (r) =>
          (!q || r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)) &&
          Object.entries(query.filters).every(([id, v]) =>
            id === 'status'
              ? r.status === v
              : String(r[id as keyof MasterRecord])
                  .toLowerCase()
                  .includes(v.toLowerCase()),
          ),
      );
      const sort = query.sort ?? { id: 'code', desc: false };
      rows = [...rows].sort(
        (a, b) =>
          String(a[sort.id as keyof MasterRecord]).localeCompare(
            String(b[sort.id as keyof MasterRecord]),
          ) * (sort.desc ? -1 : 1),
      );
      const start = query.page * query.pageSize;
      return { rows: rows.slice(start, start + query.pageSize), total: rows.length };
    },
    async create(input: MasterInput) {
      await wait(latencyMs);
      assertUniqueCode(input.code);
      const record: MasterRecord = { ...input, id: crypto.randomUUID(), version: 1 };
      records = [...records, record];
      return record;
    },
    async update(id, input, version) {
      await wait(latencyMs);
      const current = records.find((r) => r.id === id);
      if (!current) throw new ProblemError({ status: 404, title: 'Not found' });
      if (current.version !== version) {
        throw new ProblemError({
          status: 409,
          title: 'Conflict',
          detail: 'masters.server.staleVersion',
        });
      }
      assertUniqueCode(input.code, id);
      const next: MasterRecord = { ...current, ...input, version: version + 1 };
      records = records.map((r) => (r.id === id ? next : r));
      return next;
    },
  };
}

export function createDevMasterSources(latencyMs = 120): (masterId: string) => MasterDataSource {
  const cache = new Map<string, MasterDataSource>();
  return (masterId) => {
    let source = cache.get(masterId);
    if (!source) {
      source = createSource(masterId, latencyMs);
      cache.set(masterId, source);
    }
    return source;
  };
}
