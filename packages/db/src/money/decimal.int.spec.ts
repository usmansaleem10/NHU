import { randomUUID } from 'node:crypto';

import { eq, sql } from 'drizzle-orm';
import { pgTable, text } from 'drizzle-orm/pg-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase, type Database } from '../client.js';
import { tenantColumns } from '../columns/base.js';
import { tenantRlsSql } from '../tenancy/rls.js';
import { withTenant } from '../tenancy/with-tenant.js';
import { createTables, startTestDatabase, type TestDatabase } from '../testing/postgres.js';
import { assertTableTenantIsolation } from '../testing/tenant-isolation.js';
import { decimalFromDb, money, quantity, toDecimal } from './decimal.js';

const invoiceLines = pgTable('invoice_lines', {
  ...tenantColumns(),
  item: text('item').notNull(),
  qty: quantity('qty').notNull(),
  unitPrice: money('unit_price').notNull(),
  amount: money('amount').notNull(),
});

let pgc: TestDatabase;
let app: Database;

beforeAll(async () => {
  pgc = await startTestDatabase();
  await createTables(pgc.ownerUrl, { invoiceLines }, tenantRlsSql(invoiceLines));
  app = createDatabase({ connectionString: pgc.appUrl });
});

afterAll(async () => {
  await app.close();
  await pgc.stop();
});

describe('money and quantity columns against Postgres', () => {
  it('declare numeric(14,2) and numeric(14,3)', async () => {
    const result = await app.db.execute<{ column_name: string; type: string }>(sql`
      select column_name, format_type(atttypid, atttypmod) as type
        from information_schema.columns c
        join pg_attribute a on a.attrelid = 'invoice_lines'::regclass and a.attname = c.column_name
       where c.table_name = 'invoice_lines' and column_name in ('qty', 'unit_price', 'amount')
       order by column_name`);
    expect(result.rows).toEqual([
      { column_name: 'amount', type: 'numeric(14,2)' },
      { column_name: 'qty', type: 'numeric(14,3)' },
      { column_name: 'unit_price', type: 'numeric(14,2)' },
    ]);
  });

  it('round-trips exact values and sums them exactly in SQL', async () => {
    const tenantId = randomUUID();
    const { row, total } = await withTenant(app.db, { tenantId }, async (tx) => {
      await tx.insert(invoiceLines).values(
        ['0.1', '0.2', '999999999.99'].map((price) => ({
          item: `item ${price}`,
          qty: toDecimal('1'),
          unitPrice: toDecimal(price),
          amount: toDecimal(price),
        })),
      );
      const [found] = await tx.select().from(invoiceLines).where(eq(invoiceLines.item, 'item 0.1'));
      const [sum] = await tx
        .select({ total: sql<string>`sum(${invoiceLines.amount})`.mapWith(decimalFromDb) })
        .from(invoiceLines);
      return { row: found, total: sum?.total };
    });

    expect(row?.unitPrice.toFixed(2)).toBe('0.10');
    expect(row?.qty.toFixed(3)).toBe('1.000');
    expect(total?.toFixed(2)).toBe('1000000000.29');
    expect(
      toDecimal('0.1')
        .plus('0.2')
        .equals(row?.unitPrice.plus('0.2') ?? '0'),
    ).toBe(true);
  });

  it('is tenant-isolated like every tenant table', async () => {
    await assertTableTenantIsolation({
      db: app.db,
      table: invoiceLines,
      values: () => ({
        item: 'consultation',
        qty: toDecimal('1'),
        unitPrice: toDecimal('1500'),
        amount: toDecimal('1500'),
      }),
      change: { amount: toDecimal('0.01') },
    });
  });
});
