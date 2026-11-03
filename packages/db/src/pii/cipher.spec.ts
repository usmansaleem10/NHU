import { describe, expect, it } from 'vitest';

import { decrypt, DecryptionError, encrypt, keyVersionOf, newKey } from './cipher.js';
import { LocalMasterKeyProvider, MasterKeyConfigError } from './master-key.js';

const key = newKey();
const plaintext = Buffer.from('3520212345671');

describe('AES-256-GCM envelope format', () => {
  it('round-trips and records the data-key version', () => {
    const ciphertext = encrypt(key, 7, plaintext, 'tenant-a:cnic');

    expect(keyVersionOf(ciphertext)).toBe(7);
    expect(decrypt(key, ciphertext, 'tenant-a:cnic')).toEqual(plaintext);
  });

  it('uses a fresh IV, so equal values do not produce equal ciphertexts', () => {
    expect(encrypt(key, 1, plaintext, 'a')).not.toEqual(encrypt(key, 1, plaintext, 'a'));
  });

  it('refuses a ciphertext moved to another tenant or field (AAD binding)', () => {
    const ciphertext = encrypt(key, 1, plaintext, 'tenant-a:cnic');

    expect(() => decrypt(key, ciphertext, 'tenant-b:cnic')).toThrow(DecryptionError);
    expect(() => decrypt(key, ciphertext, 'tenant-a:phone')).toThrow(DecryptionError);
  });

  it('detects tampering and wrong keys', () => {
    const ciphertext = encrypt(key, 1, plaintext, 'a');
    const tampered = Buffer.from(ciphertext);
    tampered[tampered.length - 1] = (tampered.at(-1) ?? 0) ^ 1;

    expect(() => decrypt(key, tampered, 'a')).toThrow(DecryptionError);
    expect(() => decrypt(newKey(), ciphertext, 'a')).toThrow(DecryptionError);
    expect(() => decrypt(key, Buffer.from('not a ciphertext'), 'a')).toThrow(DecryptionError);
  });
});

describe('LocalMasterKeyProvider', () => {
  const b64 = (buffer: Buffer) => buffer.toString('base64');

  it('unwraps keys wrapped by a retired master key after rotation', async () => {
    const [oldKey, newMaster] = [newKey(), newKey()];
    const before = LocalMasterKeyProvider.fromEnv({
      HIMS_MASTER_KEYS: `k1:${b64(oldKey)}`,
      HIMS_MASTER_KEY_ID: 'k1',
    });
    const tenantKey = newKey();
    const { masterKeyId, wrapped } = await before.wrap(tenantKey, 'ctx');

    const after = LocalMasterKeyProvider.fromEnv({
      HIMS_MASTER_KEYS: `k1:${b64(oldKey)},k2:${b64(newMaster)}`,
      HIMS_MASTER_KEY_ID: 'k2',
    });

    expect(await after.unwrap(masterKeyId, wrapped, 'ctx')).toEqual(tenantKey);
    expect((await after.wrap(tenantKey, 'ctx')).masterKeyId).toBe('k2');
  });

  it.each([
    [{}],
    [{ HIMS_MASTER_KEYS: `k1:${b64(Buffer.alloc(16))}`, HIMS_MASTER_KEY_ID: 'k1' }],
    [{ HIMS_MASTER_KEYS: `k1:${b64(newKey())}`, HIMS_MASTER_KEY_ID: 'k9' }],
  ])('rejects bad configuration %#', (env) => {
    expect(() => LocalMasterKeyProvider.fromEnv(env)).toThrow(MasterKeyConfigError);
  });
});
