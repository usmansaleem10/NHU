import { randomUUID } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import { describe, expect, it } from 'vitest';

import { InvalidTenantContextError } from '../errors.js';
import { withTenant } from './with-tenant.js';

const db = drizzle.mock();
const noop = () => Promise.resolve();

describe('withTenant context validation', () => {
  it.each([
    ['tenantId', { tenantId: "x' or true --" }],
    ['tenantId', { tenantId: '' }],
    ['branchId', { tenantId: randomUUID(), branchId: 'branch-1' }],
    ['userId', { tenantId: randomUUID(), userId: '42' }],
  ])('rejects a malformed %s before touching the database', async (_field, context) => {
    await expect(withTenant(db, context, noop)).rejects.toBeInstanceOf(InvalidTenantContextError);
  });
});
