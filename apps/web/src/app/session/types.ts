/**
 * Session model the shell runs on. Today it comes from an in-memory dev source
 * (src/dev-fixtures/session.ts); F0-API's `GET /api/v1/session` (users P01, roles P02, tenant
 * config F0-TEN) will implement SessionSource with the same shape.
 */

import type { TenantFormatSettings } from '@hims/ui';

/** `module.resource.action`, e.g. "masters.catalog.view" (AGENTS.md rule 3). */
export type Permission = `${string}.${string}.${string}`;

/** Licensed module key from tenant config, e.g. "clinical", "masters". */
export type ModuleKey = string;

export interface Branch {
  id: string;
  name: string;
}

export interface Session {
  user: { id: string; displayName: string; roleLabel: string };
  tenant: {
    id: string;
    name: string;
    enabledModules: readonly ModuleKey[];
    /** Tenant formatting settings (F0-TEN config): region locale, time zone, currency. */
    format: TenantFormatSettings;
  };
  branches: readonly Branch[];
  activeBranchId: string;
  permissions: readonly Permission[];
}

export interface SessionSource {
  load(signal?: AbortSignal): Promise<Session>;
  switchBranch(branchId: string): Promise<Session>;
}
