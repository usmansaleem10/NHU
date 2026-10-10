import { customType, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { newId, tenantIdColumn } from '../columns/base.js';

/** Raw bytes (ciphertext, wrapped keys, blind indexes). */
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

/**
 * Per-tenant keys for PII (F0-DB-05), each wrapped by a master key (envelope encryption).
 * purpose 'data': AES-256-GCM data keys, versioned for rotation (new writes use the highest).
 * purpose 'index': the HMAC key for blind indexes; one per tenant, rotating it means reindexing.
 * Plaintext keys never touch the database. Tenant-isolated by RLS like any tenant table.
 */
export const tenantKeys = pgTable(
  'tenant_keys',
  {
    id: uuid('id').primaryKey().$defaultFn(newId),
    tenantId: tenantIdColumn(),
    purpose: text('purpose', { enum: ['data', 'index'] }).notNull(),
    keyVersion: integer('key_version').notNull(),
    masterKeyId: text('master_key_id').notNull(),
    wrappedKey: bytea('wrapped_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('tenant_keys_tenant_purpose_version').on(t.tenantId, t.purpose, t.keyVersion)],
);
