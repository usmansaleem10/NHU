/**
 * DEV FIXTURE — not production data. Fake POST /api/v1/patients/search over the 10,000 demo
 * patients, with deterministic synthetic identifiers. Identifiers are exact-match lookups; name is
 * a contains search capped at 25 results. Personal identifiers go in the request BODY (never the
 * URL) and come back masked.
 */
import type { PatientSearchQuery, PatientSearchResult } from '@hims/ui';

import type { DemoPatient } from '../features/foundation';
import { createDemoPatientSource, DEMO_PATIENT_COUNT } from './demo-patients';

const pad = (n: number, width: number) => String(n).padStart(width, '0');

/** Synthetic identifiers derived from the demo row number (not real people). */
function identifiers(n: number) {
  return {
    phone: `0300${pad(n, 7)}`,
    cnic: `35202${pad(n, 7)}1`,
    employeeId: n % 10 === 0 ? `EMP-${pad(n, 5)}` : null,
    admissionId: `ADM-2026-${pad(n, 5)}`,
  };
}

const maskCnic = (cnic: string) => `${cnic.slice(0, 5)}-*******-${cnic.slice(12)}`;

export function createPatientSearch(latencyMs = 250) {
  const source = createDemoPatientSource(0);
  let all: readonly DemoPatient[] | undefined;

  return async (query: PatientSearchQuery, signal: AbortSignal): Promise<PatientSearchResult[]> => {
    all ??= (
      await source({ page: 0, pageSize: DEMO_PATIENT_COUNT, sort: null, search: '', filters: {} })
    ).rows;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, latencyMs);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('aborted'));
      });
    });

    const v = query.value;
    const matches = all.filter((p, i) => {
      const ids = identifiers(i + 1);
      switch (query.type) {
        case 'mrn':
          return p.mrn === v;
        case 'name':
          return p.name.toLowerCase().includes(v.toLowerCase());
        case 'phone':
          return ids.phone === v;
        case 'cnic':
          return ids.cnic === v;
        case 'employeeId':
          return ids.employeeId === v;
        case 'admissionId':
          return ids.admissionId === v;
      }
    });

    return matches.slice(0, 25).map((p) => {
      const n = Number(p.mrn.slice(3));
      return {
        id: p.id,
        mrn: p.mrn,
        name: p.name,
        details: `${p.gender === 'female' ? 'F' : 'M'} · ${p.ward} · ${maskCnic(identifiers(n).cnic)}`,
      };
    });
  };
}
