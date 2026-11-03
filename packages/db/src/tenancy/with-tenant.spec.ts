import { randomUUID } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import { describe, expect, it } from 'vitest';

import { InvalidTenantContextError } from '../errors.js';
import { type TenantContext, withTenant } from './with-tenant.js';

const db = drizzle.mock();
const noop = () => Promise.resolve();
const all = 'all' as const;

describe('withTenant context validation', () => {
  it.each([
    ['tenantId', { tenantId: "x' or true --", branchId: all }],
    ['tenantId', { tenantId: '', branchId: all }],
    ['tenantId (missing)', { branchId: all }],
    ['branchId (missing: tenant-wide access must be explicit)', { tenantId: randomUUID() }],
    ['branchId', { tenantId: randomUUID(), branchId: 'branch-1' }],
    ['userId', { tenantId: randomUUID(), branchId: all, userId: '42' }],
  ])('rejects a malformed %s before touching the database', async (_field, context) => {
    await expect(withTenant(db, context as TenantContext, noop)).rejects.toBeInstanceOf(
      InvalidTenantContextError,
    );
  });
});
