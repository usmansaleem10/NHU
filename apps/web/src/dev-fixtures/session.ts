/**
 * DEV FIXTURE — not production data. In-memory SessionSource used until F0-API ships
 * `GET /api/v1/session`. Personas let E2E and developers exercise permission/module filtering.
 * Pick one with localStorage `hims.dev.persona` = admin | nurse | unlicensed (a preference key,
 * never a credential).
 */
import type { Permission, Session, SessionSource } from '../app/session/types';

const ALL_PERMISSIONS: Permission[] = [
  'home.dashboard.view',
  'foundation.table.view',
  'foundation.form.view',
  'foundation.patientSearch.view',
  'masters.catalog.view',
  'masters.staff-types.view',
  'masters.staff-types.create',
  'masters.staff-types.update',
];

const PK_FORMAT = { locale: 'en-PK', timeZone: 'Asia/Karachi', currency: 'PKR' };

const BRANCHES = [
  { id: 'br-main', name: 'Main Campus' },
  { id: 'br-city', name: 'City Clinic' },
];

const PERSONAS: Record<string, Omit<Session, 'activeBranchId'>> = {
  admin: {
    user: { id: 'u-admin', displayName: 'Demo Admin', roleLabel: 'Tenant administrator' },
    tenant: {
      id: 'demo-a',
      name: 'Demo Hospital A',
      enabledModules: ['home', 'foundation', 'masters'],
      format: PK_FORMAT,
    },
    branches: BRANCHES,
    permissions: ALL_PERMISSIONS,
  },
  // Front-desk style user: may search patients and view masters, nothing else.
  nurse: {
    user: { id: 'u-nurse', displayName: 'Demo Nurse', roleLabel: 'Ward nurse' },
    tenant: {
      id: 'demo-a',
      name: 'Demo Hospital A',
      enabledModules: ['home', 'foundation', 'masters'],
      format: PK_FORMAT,
    },
    branches: BRANCHES.slice(0, 1),
    permissions: [
      'home.dashboard.view',
      'foundation.patientSearch.view',
      'masters.catalog.view',
      'masters.staff-types.view',
    ],
  },
  // Has every permission but the tenant hasn't licensed the masters module.
  unlicensed: {
    user: { id: 'u-admin-b', displayName: 'Demo Admin B', roleLabel: 'Tenant administrator' },
    tenant: {
      id: 'demo-b',
      name: 'Demo Hospital B',
      enabledModules: ['home', 'foundation'],
      format: { ...PK_FORMAT, dateStyle: 'long' },
    },
    branches: BRANCHES,
    permissions: ALL_PERMISSIONS,
  },
};

const DEFAULT_PERSONA = 'nurse'; // least privileged: forgetting to pick one never grants admin

function storedPersona(): string | null {
  try {
    return localStorage.getItem('hims.dev.persona');
  } catch {
    return null;
  }
}

/** Fails closed: an unknown persona is an error, never a silent fallback to admin. */
export function resolvePersona(name: string | null): Omit<Session, 'activeBranchId'> {
  const key = name ?? DEFAULT_PERSONA;
  const persona = Object.hasOwn(PERSONAS, key) ? PERSONAS[key] : undefined;
  if (!persona) throw new Error(`Unknown dev persona "${key}"`);
  return persona;
}

export function createDevSessionSource(latencyMs = 120): SessionSource {
  let session: Session | null = null;
  // Resolved on first load so a bad persona surfaces as the session error screen.
  const current = (): Session => {
    if (!session) {
      const base = resolvePersona(storedPersona());
      session = { ...base, activeBranchId: base.branches[0]?.id ?? '' };
    }
    return session;
  };
  const delay = <T>(value: () => T) =>
    new Promise<T>((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(value());
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      }, latencyMs);
    });
  return {
    load: () => delay(current),
    switchBranch: (branchId) =>
      delay(() => {
        const s = current();
        if (!s.branches.some((b) => b.id === branchId))
          throw new Error(`Unknown branch ${branchId}`);
        session = { ...s, activeBranchId: branchId };
        return session;
      }),
  };
}
