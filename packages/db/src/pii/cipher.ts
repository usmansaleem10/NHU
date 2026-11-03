import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

import { DbError } from '../errors.js';

/**
 * Ciphertext layout (bytea), versioned so the format and keys can change without a big-bang
 * migration:
 *   [0]      format version (1)
 *   [1..4]   data-key version, uint32 BE (which tenant key decrypts it)
 *   [5..16]  96-bit random IV
 *   [17..32] 128-bit GCM auth tag
 *   [33..]   ciphertext
 */
const FORMAT_V1 = 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = 1 + 4 + IV_BYTES + TAG_BYTES;
export const KEY_BYTES = 32;

/** Decryption failed: wrong key, wrong context (tenant/field) or tampered data. */
export class DecryptionError extends DbError {
  readonly code = 'DECRYPTION_FAILED';

  constructor(options?: ErrorOptions) {
    super('PII decryption failed', options);
  }
}

export function newKey(): Buffer {
  return randomBytes(KEY_BYTES);
}

/** AES-256-GCM. `aad` binds the ciphertext to its context; decrypting elsewhere fails. */
export function encrypt(key: Buffer, keyVersion: number, plaintext: Buffer, aad: string): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const header = Buffer.alloc(5);
  header.writeUInt8(FORMAT_V1, 0);
  header.writeUInt32BE(keyVersion, 1);
  return Buffer.concat([header, iv, cipher.getAuthTag(), body]);
}

/** The data-key version a ciphertext was written with. */
export function keyVersionOf(ciphertext: Buffer): number {
  if (ciphertext.length < HEADER_BYTES || ciphertext.readUInt8(0) !== FORMAT_V1) {
    throw new DecryptionError();
  }
  return ciphertext.readUInt32BE(1);
}

export function decrypt(key: Buffer, ciphertext: Buffer, aad: string): Buffer {
  keyVersionOf(ciphertext); // validates the header
  try {
    const iv = ciphertext.subarray(5, 5 + IV_BYTES);
    const tag = ciphertext.subarray(5 + IV_BYTES, HEADER_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from(aad, 'utf8'));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext.subarray(HEADER_BYTES)), decipher.final()]);
  } catch (error) {
    throw new DecryptionError({ cause: error });
  }
}

/** Deterministic HMAC-SHA256 for exact-match search without storing plaintext. */
export function hmac(key: Buffer, field: string, normalisedValue: string): Buffer {
  return createHmac('sha256', key).update(`${field}\u0000${normalisedValue}`, 'utf8').digest();
}
