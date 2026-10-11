import { randomUUID } from 'node:crypto';

import { eq, sql } from 'drizzle-orm';
import { pgTable, text } from 'drizzle-orm/pg-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase, type Database } from '../client.js';
import { tenantColumns } from '../columns/base.js';
import { bytea, tenantKeys } from '../schema/tenant-keys.js';
import { tenantRlsSql } from '../tenancy/rls.js';
import { withTenant } from '../tenancy/with-tenant.js';
import { createTables, startTestDatabase, type TestDatabase } from '../testing/postgres.js';
import { assertTableTenantIsolation } from '../testing/tenant-isolation.js';
import { DecryptionError, newKey } from './cipher.js';
import { MissingTenantContextError, PiiKeyring } from './keyring.js';
import { LocalMasterKeyProvider } from './master-key.js';

// How a feature table stores PII: ciphertext + blind index, never plaintext.
const patients = pgTable('patients', {
  ...tenantColumns(),
  name: text('name').notNull(),
  cnicEnc: bytea('cnic_enc'),
  cnicBidx: bytea('cnic_bidx'),
  phoneEnc: bytea('phone_enc'),
  phoneBidx: bytea('phone_bidx'),
});

const CNIC = '35202-1234567-1';
const PHONE = '0300-1234567';
const A = randomUUID();
const B = randomUUID();

let pgc: TestDatabase;
let app: Database;
let owner: Database;
const keyring = new PiiKeyring(new LocalMasterKeyProvider({ k1: newKey() }, 'k1'));

const register = (tenantId: string, name: string, cnic: string, phone: string) =>
  withTenant(app.db, { tenantId }, async (tx) => {
    const pii = await keyring.forTenant(tx);
    const c = await pii.protectCnic(cnic);
    const p = await pii.protectPhone(phone);
    const [row] = await tx
      .insert(patients)
      .values({
        name,
        cnicEnc: c.encrypted,
        cnicBidx: c.index,
        phoneEnc: p.encrypted,
        phoneBidx: p.index,
      })
      .returning({ id: patients.id });
    if (!row) throw new Error('insert returned nothing');
    return row.id;
  });

const findByCnic = (tenantId: string, cnic: string) =>
  withTenant(app.db, { tenantId }, async (tx) => {
    const pii = await keyring.forTenant(tx);
    return tx
      .select({ name: patients.name })
      .from(patients)
      .where(eq(patients.cnicBidx, await pii.cnicIndex(cnic)));
  });

beforeAll(async () => {
  pgc = await startTestDatabase();
  await createTables(pgc.ownerUrl, { patients }, tenantRlsSql(patients));
  app = createDatabase({ connectionString: pgc.appUrl });
  owner = createDatabase({ connectionString: pgc.superUrl }); // raw inspection: bypasses RLS
  await register(A, 'Ayesha', CNIC, PHONE);
  await register(B, 'Bilal', CNIC, PHONE); // same person registered at another hospital
});

afterAll(async () => {
  await app.close();
  await owner.close();
  await pgc.stop();
});

describe('PII at rest', () => {
  it('stores only ciphertext: the raw database never contains the CNIC or phone', async () => {
    const raw = await owner.db.execute(sql`select * from patients`);
    const dump = JSON.stringify(raw.rows, (_k, v: unknown) =>
      Buffer.isBuffer(v) ? v.toString('latin1') : v,
    );

    for (const plain of ['3520212345671', '35202-1234567-1', '3001234567', '+923001234567']) {
      expect(dump).not.toContain(plain);
    }
    const keys = await owner.db.execute(sql`select * from tenant_keys`);
    expect(keys.rows).toHaveLength(4); // data + index key for each tenant, wrapped only
  });

  it('decrypts back to the normalised value for the owning tenant', async () => {
    const values = await withTenant(app.db, { tenantId: A }, async (tx) => {
      const pii = await keyring.forTenant(tx);
      const [row] = await tx.select().from(patients);
      if (!row?.cnicEnc || !row.phoneEnc) throw new Error('fixture missing');
      return [await pii.decrypt('cnic', row.cnicEnc), await pii.decrypt('phone', row.phoneEnc)];
    });
    expect(values).toEqual(['3520212345671', '+923001234567']);
  });

  it('finds a patient by exact CNIC or phone, whatever the spelling', async () => {
    expect(await findByCnic(A, '3520212345671')).toEqual([{ name: 'Ayesha' }]);
    const byPhone = await withTenant(app.db, { tenantId: A }, async (tx) => {
      const pii = await keyring.forTenant(tx);
      return tx
        .select({ name: patients.name })
        .from(patients)
        .where(eq(patients.phoneBidx, await pii.phoneIndex('+92 300 1234567')));
    });
    expect(byPhone).toEqual([{ name: 'Ayesha' }]);
  });

  it('gives the same CNIC different blind indexes per tenant (no cross-tenant linkage)', async () => {
    const raw = await owner.db.execute<{ cnic_bidx: Buffer }>(
      sql`select cnic_bidx from patients order by name`,
    );
    const [a, b] = raw.rows.map((r) => r.cnic_bidx.toString('hex'));
    expect(a).not.toBe(b);
    expect(await findByCnic(B, CNIC)).toEqual([{ name: 'Bilal' }]);
  });

  it("cannot decrypt another tenant's ciphertext even if it is copied across", async () => {
    const raw = await owner.db.execute<{ cnic_enc: Buffer }>(
      sql`select cnic_enc from patients where tenant_id = ${B}`,
    );
    const stolen = raw.rows[0]?.cnic_enc;
    if (!stolen) throw new Error('fixture missing');

    await expect(
      withTenant(app.db, { tenantId: A }, async (tx) =>
        (await keyring.forTenant(tx)).decrypt('cnic', stolen),
      ),
    ).rejects.toBeInstanceOf(DecryptionError);
  });

  it('requires a tenant context', async () => {
    await expect(keyring.forTenant(app.db)).rejects.toBeInstanceOf(MissingTenantContextError);
  });
});

describe('data key rotation', () => {
  it('encrypts new values with the new key while old values still decrypt', async () => {
    const tenantId = randomUUID();
    const result = await withTenant(app.db, { tenantId }, async (tx) => {
      const before = await (await keyring.forTenant(tx)).encrypt('cnic', 'old');
      const version = await keyring.rotateDataKey(tx);
      const pii = await keyring.forTenant(tx);
      const after = await pii.encrypt('cnic', 'new');
      return {
        version,
        versions: [before.readUInt32BE(1), after.readUInt32BE(1)],
        plain: [await pii.decrypt('cnic', before), await pii.decrypt('cnic', after)],
        index: (await pii.cnicIndex(CNIC)).equals(
          await (await keyring.forTenant(tx)).cnicIndex(CNIC),
        ),
      };
    });
    expect(result).toEqual({ version: 2, versions: [1, 2], plain: ['old', 'new'], index: true });
  });
});

describe('tenant_keys isolation', () => {
  it("one tenant can neither read nor overwrite another tenant's keys", async () => {
    await assertTableTenantIsolation({
      db: app.db,
      table: tenantKeys,
      values: () => ({
        purpose: 'data' as const,
        keyVersion: Math.floor(Math.random() * 1e6) + 100,
        masterKeyId: 'k1',
        wrappedKey: Buffer.from('wrapped'),
      }),
      change: { masterKeyId: 'attacker' },
    });
  });
});
