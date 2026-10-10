import { and, eq, sql } from 'drizzle-orm';

import type { DbExecutor } from '../client.js';
import { DbError } from '../errors.js';
import { tenantKeys } from '../schema/tenant-keys.js';
import { decrypt, encrypt, hmac, keyVersionOf, newKey } from './cipher.js';
import type { MasterKeyProvider } from './master-key.js';
import { normaliseCnic, normalisePkPhone } from './normalise.js';

type Purpose = 'data' | 'index';

export class MissingTenantContextError extends DbError {
  readonly code = 'MISSING_TENANT_CONTEXT';

  constructor() {
    super('PII keys need a tenant context: call inside withTenant');
  }
}

/** A ciphertext names a key version this tenant does not have (or data from another tenant). */
export class UnknownKeyVersionError extends DbError {
  readonly code = 'UNKNOWN_KEY_VERSION';

  constructor(purpose: string, version: number) {
    super(`No ${purpose} key version ${String(version)} for this tenant`);
  }
}

/** Encrypted value plus its blind index, ready for the *_enc / *_bidx columns. */
export interface ProtectedValue {
  encrypted: Buffer;
  index: Buffer;
}

/** PII operations for one tenant. Obtain with PiiKeyring.forTenant(tx) inside withTenant. */
export interface TenantPii {
  readonly tenantId: string;
  /** AES-256-GCM with the tenant's newest data key; bound to tenant + field. */
  encrypt(field: string, value: string): Promise<Buffer>;
  decrypt(field: string, ciphertext: Buffer): Promise<string>;
  /** Same, for binary PII (photo, thumbprint template). */
  encryptBytes(field: string, value: Buffer): Promise<Buffer>;
  decryptBytes(field: string, ciphertext: Buffer): Promise<Buffer>;
  /** HMAC-SHA256 of an already-normalised value with the tenant's index key. */
  blindIndex(field: string, normalisedValue: string): Promise<Buffer>;
  /** Normalise + encrypt + index. Throws InvalidPiiError on malformed input. */
  protectCnic(raw: string): Promise<ProtectedValue>;
  protectPhone(raw: string): Promise<ProtectedValue>;
  /** Blind index for searching: normalises first, so any spelling finds the record. */
  cnicIndex(raw: string): Promise<Buffer>;
  phoneIndex(raw: string): Promise<Buffer>;
}

const wrapContext = (tenantId: string, purpose: Purpose, version: number) =>
  `hims:tenant-key:${tenantId}:${purpose}:${String(version)}`;
const dataContext = (tenantId: string, field: string) => `hims:pii:${tenantId}:${field}`;

async function currentTenantId(tx: DbExecutor): Promise<string> {
  const result = await tx.execute<{ tenant_id: string | null }>(
    sql`select app_current_tenant_id() as tenant_id`,
  );
  const tenantId = result.rows[0]?.tenant_id;
  if (!tenantId) throw new MissingTenantContextError();
  return tenantId;
}

/**
 * Envelope encryption for PII. One instance per process (it caches unwrapped tenant keys in
 * memory); the master key provider is the only place a master key lives.
 */
export class PiiKeyring {
  readonly #unwrapped = new Map<string, Promise<Buffer>>();

  constructor(private readonly provider: MasterKeyProvider) {}

  /** Loads (creating on first use) the current tenant's keys. tx must be a withTenant transaction. */
  async forTenant(tx: DbExecutor): Promise<TenantPii> {
    const tenantId = await currentTenantId(tx);
    let rows = await this.#load(tx);
    if (!rows.some((r) => r.purpose === 'data') || !rows.some((r) => r.purpose === 'index')) {
      await this.#create(tx, tenantId, 'data', 1);
      await this.#create(tx, tenantId, 'index', 1);
      rows = await this.#load(tx);
    }

    const wrapped = new Map(rows.map((r) => [`${r.purpose}:${String(r.keyVersion)}`, r]));
    const key = (purpose: Purpose, version: number): Promise<Buffer> => {
      const row = wrapped.get(`${purpose}:${String(version)}`);
      if (!row) throw new UnknownKeyVersionError(purpose, version);
      const cacheKey = `${tenantId}:${purpose}:${String(version)}`;
      let unwrapped = this.#unwrapped.get(cacheKey);
      if (!unwrapped) {
        unwrapped = this.provider.unwrap(
          row.masterKeyId,
          row.wrappedKey,
          wrapContext(tenantId, purpose, version),
        );
        unwrapped.catch(() => this.#unwrapped.delete(cacheKey));
        this.#unwrapped.set(cacheKey, unwrapped);
      }
      return unwrapped;
    };
    const latestData = Math.max(
      ...rows.filter((r) => r.purpose === 'data').map((r) => r.keyVersion),
    );
    const indexVersion = Math.max(
      ...rows.filter((r) => r.purpose === 'index').map((r) => r.keyVersion),
    );

    const encryptBytes = async (field: string, value: Buffer) =>
      encrypt(await key('data', latestData), latestData, value, dataContext(tenantId, field));
    const decryptBytes = async (field: string, ciphertext: Buffer) =>
      decrypt(
        await key('data', keyVersionOf(ciphertext)),
        ciphertext,
        dataContext(tenantId, field),
      );
    const blindIndex = async (field: string, normalisedValue: string) =>
      hmac(await key('index', indexVersion), field, normalisedValue);
    const protect = async (field: string, normalised: string): Promise<ProtectedValue> => ({
      encrypted: await encryptBytes(field, Buffer.from(normalised, 'utf8')),
      index: await blindIndex(field, normalised),
    });

    return {
      tenantId,
      encrypt: (field, value) => encryptBytes(field, Buffer.from(value, 'utf8')),
      decrypt: async (field, ciphertext) =>
        (await decryptBytes(field, ciphertext)).toString('utf8'),
      encryptBytes,
      decryptBytes,
      blindIndex,
      protectCnic: (raw) => protect('cnic', normaliseCnic(raw)),
      protectPhone: (raw) => protect('phone', normalisePkPhone(raw)),
      cnicIndex: (raw) => blindIndex('cnic', normaliseCnic(raw)),
      phoneIndex: (raw) => blindIndex('phone', normalisePkPhone(raw)),
    };
  }

  /**
   * Adds the next data-key version; new writes use it, old ciphertexts still decrypt (each
   * carries its key version). Re-encrypting old rows is a separate background job.
   */
  async rotateDataKey(tx: DbExecutor): Promise<number> {
    const tenantId = await currentTenantId(tx);
    const result = await tx.execute<{ next: number }>(sql`
      select coalesce(max(key_version), 0) + 1 as next from tenant_keys where purpose = 'data'`);
    const next = result.rows[0]?.next ?? 1;
    await this.#create(tx, tenantId, 'data', next);
    return next;
  }

  #load(tx: DbExecutor) {
    return tx
      .select({
        purpose: tenantKeys.purpose,
        keyVersion: tenantKeys.keyVersion,
        masterKeyId: tenantKeys.masterKeyId,
        wrappedKey: tenantKeys.wrappedKey,
      })
      .from(tenantKeys);
  }

  async #create(tx: DbExecutor, tenantId: string, purpose: Purpose, version: number) {
    const exists = await tx
      .select({ id: tenantKeys.id })
      .from(tenantKeys)
      .where(and(eq(tenantKeys.purpose, purpose), eq(tenantKeys.keyVersion, version)));
    if (exists.length > 0) return;
    const { masterKeyId, wrapped } = await this.provider.wrap(
      newKey(),
      wrapContext(tenantId, purpose, version),
    );
    // A concurrent first use may insert the same version; the unique key keeps one.
    await tx
      .insert(tenantKeys)
      .values({ purpose, keyVersion: version, masterKeyId, wrappedKey: wrapped })
      .onConflictDoNothing();
  }
}
