/**
 * DEV FIXTURE — not production data. A fake "server" holding 10,000 generated demo rows so the
 * data table can be exercised at realistic volume before the API exists. It answers TableQuery
 * exactly like the real list endpoint will: filter + sort + one page, with network latency. The
 * client never receives more than one page per request.
 */
import type { DataPage, TableQuery } from '@hims/ui';

import { DEMO_WARDS, type DemoPatient } from '../features/foundation';

const WARDS = DEMO_WARDS;
const STATUSES: DemoPatient['status'][] = [
  'admitted',
  'admitted',
  'admitted',
  'discharged',
  'transferred',
];

// Deterministic PRNG so E2E assertions are stable across runs.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generate(count: number): DemoPatient[] {
  const rand = mulberry32(42);
  const base = Date.UTC(2026, 0, 1);
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const paisa = Math.floor(rand() * 50_000_000);
    return {
      id: `p${String(n)}`,
      mrn: `MR-${String(n).padStart(6, '0')}`,
      name: `Demo Patient ${String(n).padStart(5, '0')}`,
      gender: rand() < 0.5 ? 'female' : 'male',
      ward: WARDS[Math.floor(rand() * WARDS.length)] ?? 'Ward A',
      admittedAt: new Date(
        base + Math.floor(rand() * 280) * 86_400_000 + Math.floor(rand() * 86_400) * 1000,
      ).toISOString(),
      status: STATUSES[Math.floor(rand() * STATUSES.length)] ?? 'admitted',
      balance: `${String(Math.floor(paisa / 100))}.${String(paisa % 100).padStart(2, '0')}`,
    };
  });
}

let rows: DemoPatient[] | undefined;

export const DEMO_PATIENT_COUNT = 10_000;

function compare(a: DemoPatient, b: DemoPatient, id: string): number {
  if (id === 'balance') return Number(a.balance) - Number(b.balance);
  const key = id as keyof DemoPatient;
  return a[key].localeCompare(b[key]);
}

export function createDemoPatientSource(latencyMs = 150) {
  return (query: TableQuery, signal?: AbortSignal): Promise<DataPage<DemoPatient>> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        rows ??= generate(DEMO_PATIENT_COUNT);
        const q = query.search.trim().toLowerCase();
        let result = rows.filter(
          (r) =>
            (!q || r.name.toLowerCase().includes(q) || r.mrn.toLowerCase().includes(q)) &&
            Object.entries(query.filters).every(([id, value]) => {
              const field = r[id as keyof DemoPatient];
              return id === 'mrn' || id === 'name'
                ? field.toLowerCase().includes(value.toLowerCase())
                : field === value;
            }),
        );
        if (query.sort) {
          const { id, desc } = query.sort;
          result = [...result].sort((a, b) => compare(a, b, id) * (desc ? -1 : 1));
        }
        const start = query.page * query.pageSize;
        resolve({ rows: result.slice(start, start + query.pageSize), total: result.length });
      }, latencyMs);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(signal.reason instanceof Error ? signal.reason : new Error('aborted'));
      });
    });
}
