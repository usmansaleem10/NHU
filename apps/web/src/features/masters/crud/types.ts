import type { DataPage, TableQuery } from '@hims/ui';

import type { Language } from '../../../app/i18n/i18n';
import type { ModuleKey, Permission } from '../../../app/session/types';

/**
 * A "simple master" (P04 reference data): the ~60 code/name/description/status lists such as
 * staff types, document types, relations. Records carry an optimistic-lock `version`.
 */
export interface MasterRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  version: number;
}

export type MasterInput = Pick<MasterRecord, 'code' | 'name' | 'description' | 'status'>;

/**
 * What the generated screen needs from the server. The F0-API contracts client implements it per
 * resource: GET/POST /api/v1/<id>, PUT /api/v1/<id>/:id (If-Match: version). Errors are thrown
 * as ProblemError so field errors land on the form.
 */
export interface MasterDataSource {
  list(query: TableQuery, signal?: AbortSignal): Promise<DataPage<MasterRecord>>;
  create(input: MasterInput): Promise<MasterRecord>;
  update(id: string, input: MasterInput, version: number): Promise<MasterRecord>;
}

export interface MasterLabels {
  /** Plural screen title, e.g. "Staff types". */
  title: string;
  /** Singular noun for buttons and dialogs, e.g. "staff type". */
  singular: string;
  description?: string;
}

/** Everything a new simple master screen needs. One file per master in ../metadata. */
export interface MasterMetadata {
  /** URL segment and API resource (plural kebab-case), e.g. "staff-types". */
  id: string;
  /** Labels per language. English is required; others fall back to it. */
  labels: { en: MasterLabels } & Partial<Record<Exclude<Language, 'en'>, MasterLabels>>;
  /** Licensed module the master belongs to. */
  module: ModuleKey;
  permissions: { view: Permission; create: Permission; update: Permission };
  /** Code rule. Defaults: 2–20 chars of A–Z, 0–9, '-' and '_'. */
  code?: { pattern?: RegExp; maxLength?: number };
  nameMaxLength?: number;
}

/**
 * Builds metadata for a standard master with conventional permissions
 * (`masters.<id>.view|create|update`) in the `masters` module.
 */
export function defineSimpleMaster(
  meta: Pick<MasterMetadata, 'id' | 'labels'> & Partial<MasterMetadata>,
): MasterMetadata {
  return {
    module: 'masters',
    permissions: {
      view: `masters.${meta.id}.view`,
      create: `masters.${meta.id}.create`,
      update: `masters.${meta.id}.update`,
    },
    ...meta,
  };
}
