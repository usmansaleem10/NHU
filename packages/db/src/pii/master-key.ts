import { DbError } from '../errors.js';
import { decrypt, encrypt, KEY_BYTES } from './cipher.js';

/**
 * Wraps and unwraps per-tenant keys (envelope encryption). Production implements this over a
 * KMS (AWS KMS / GCP KMS / Vault Transit) so the master key never leaves it; local dev and tests
 * use LocalMasterKeyProvider with keys from the environment.
 */
export interface MasterKeyProvider {
  /** Master key used to wrap new tenant keys. */
  readonly activeKeyId: string;
  wrap(tenantKey: Buffer, context: string): Promise<{ masterKeyId: string; wrapped: Buffer }>;
  unwrap(masterKeyId: string, wrapped: Buffer, context: string): Promise<Buffer>;
}

export class MasterKeyConfigError extends DbError {
  readonly code = 'MASTER_KEY_CONFIG';

  constructor(detail: string) {
    super(`Master key configuration: ${detail}`);
  }
}

/** AES-256-GCM key wrapping with in-process master keys. Not for production. */
export class LocalMasterKeyProvider implements MasterKeyProvider {
  readonly #keys: ReadonlyMap<string, Buffer>;

  constructor(
    keys: Readonly<Record<string, Buffer>>,
    readonly activeKeyId: string,
  ) {
    this.#keys = new Map(Object.entries(keys));
    for (const [id, key] of this.#keys) {
      if (key.length !== KEY_BYTES) {
        throw new MasterKeyConfigError(`master key ${id} must be ${String(KEY_BYTES)} bytes`);
      }
    }
    if (!this.#keys.has(activeKeyId)) {
      throw new MasterKeyConfigError(`active master key ${activeKeyId} is not configured`);
    }
  }

  /**
   * HIMS_MASTER_KEYS="k2026a:<base64 32 bytes>,k2026b:<base64>" (old keys stay listed so
   * existing tenant keys still unwrap) and HIMS_MASTER_KEY_ID="k2026b" (wraps new keys).
   */
  static fromEnv(env: NodeJS.ProcessEnv = process.env): LocalMasterKeyProvider {
    const list = env['HIMS_MASTER_KEYS'];
    const active = env['HIMS_MASTER_KEY_ID'];
    if (!list || !active) {
      throw new MasterKeyConfigError('HIMS_MASTER_KEYS and HIMS_MASTER_KEY_ID must be set');
    }
    const keys: Record<string, Buffer> = {};
    for (const entry of list.split(',')) {
      const [id, b64] = entry.trim().split(':');
      if (!id || !b64) throw new MasterKeyConfigError('HIMS_MASTER_KEYS entries are id:base64');
      keys[id] = Buffer.from(b64, 'base64');
    }
    return new LocalMasterKeyProvider(keys, active);
  }

  wrap(tenantKey: Buffer, context: string): Promise<{ masterKeyId: string; wrapped: Buffer }> {
    return Promise.resolve({
      masterKeyId: this.activeKeyId,
      wrapped: encrypt(this.#key(this.activeKeyId), 0, tenantKey, context),
    });
  }

  unwrap(masterKeyId: string, wrapped: Buffer, context: string): Promise<Buffer> {
    return Promise.resolve(decrypt(this.#key(masterKeyId), wrapped, context));
  }

  #key(id: string): Buffer {
    const key = this.#keys.get(id);
    if (!key) throw new MasterKeyConfigError(`master key ${id} is not configured`);
    return key;
  }
}
