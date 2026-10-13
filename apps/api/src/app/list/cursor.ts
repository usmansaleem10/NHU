import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto';

import { z } from 'zod';

import { ValidationError } from '../errors/domain-error';

export type CursorValue = string | number | boolean;

/**
 * Who a cursor belongs to. Required so a cursor can never be replayed by another tenant or
 * user; pass `null`s only for genuinely public listings. Filled from the session once auth lands.
 */
export interface CursorScope {
  tenantId: string | null;
  userId: string | null;
}

/** Everything a cursor is bound to; decoding with any different value fails. */
export interface CursorBinding {
  /** Listing identifier, e.g. `patients`. */
  resource: string;
  scope: CursorScope;
  /** Sort signature, e.g. `-createdAt,id`. */
  sort: string;
  /** Parsed filter of the listing (bound by value; key order does not matter). */
  filter: unknown;
}

export interface CursorCodecOptions {
  /** Cursor lifetime. Default 24 h. */
  ttlMs?: number;
  /** Clock override (tests). */
  now?: () => number;
}

const MIN_SECRET_LENGTH = 32;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const IV_BYTES = 12;
const TAG_BYTES = 16;

const payloadSchema = z.strictObject({
  v: z.literal(1),
  /** Expiry, epoch ms. */
  exp: z.number().int(),
  /** Key values of the last row of the page, in sort order. */
  k: z.array(z.union([z.string(), z.number(), z.boolean()])).max(8),
});

function cursorError(code: 'list.cursor_invalid' | 'list.cursor_expired'): ValidationError {
  return new ValidationError(code, 'The page cursor is invalid or expired; restart the listing', {
    errors: [{ path: 'cursor', message: 'Invalid cursor' }],
  });
}

function hasToJSON(value: object): value is { toJSON: () => unknown } {
  return typeof (value as { toJSON?: unknown }).toJSON === 'function';
}

/**
 * JSON with object keys sorted at every level, so equal filters hash equally. Mirrors
 * JSON.stringify for `toJSON` (a Date binds by its instant) and encodes bigint as `"<n>n"`.
 */
function canonicalJson(input: unknown): string {
  const value =
    input !== null && typeof input === 'object' && hasToJSON(input) ? input.toJSON() : input;
  if (typeof value === 'bigint') return JSON.stringify(`${value.toString()}n`);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  return 'null';
}

function associatedData(binding: CursorBinding): Buffer {
  const filterHash = createHash('sha256').update(canonicalJson(binding.filter)).digest('hex');
  return Buffer.from(
    canonicalJson({
      v: 1,
      resource: binding.resource,
      tenantId: binding.scope.tenantId,
      userId: binding.scope.userId,
      sort: binding.sort,
      filter: filterHash,
    }),
  );
}

/**
 * Opaque keyset cursor: AES-256-GCM over `{ key values, expiry }` (key derived with HKDF from
 * CURSOR_SECRET, info `list-cursor`), with resource, scope, sort and a filter hash as
 * associated data. Clients can neither read positions nor forge or replay them elsewhere;
 * any mismatch is a 400 `list.cursor_invalid`, an old cursor a 400 `list.cursor_expired`.
 */
export class CursorCodec {
  private readonly key: Buffer;
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(secret: string, options: CursorCodecOptions = {}) {
    if (secret.length < MIN_SECRET_LENGTH) {
      throw new Error(`Cursor secret must be at least ${String(MIN_SECRET_LENGTH)} characters`);
    }
    this.key = Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), 'list-cursor', 32));
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.now = options.now ?? Date.now;
  }

  encode(binding: CursorBinding, key: readonly CursorValue[]): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(associatedData(binding));
    const payload = JSON.stringify({ v: 1, exp: this.now() + this.ttlMs, k: key });
    const ciphertext = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, ciphertext, cipher.getAuthTag()]).toString('base64url');
  }

  decode(cursor: string, binding: CursorBinding): CursorValue[] {
    const bytes = Buffer.from(cursor, 'base64url');
    if (bytes.length <= IV_BYTES + TAG_BYTES || bytes.toString('base64url') !== cursor) {
      throw cursorError('list.cursor_invalid');
    }

    let json: unknown;
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.key, bytes.subarray(0, IV_BYTES));
      decipher.setAAD(associatedData(binding));
      decipher.setAuthTag(bytes.subarray(bytes.length - TAG_BYTES));
      const plaintext = Buffer.concat([
        decipher.update(bytes.subarray(IV_BYTES, bytes.length - TAG_BYTES)),
        decipher.final(),
      ]);
      json = JSON.parse(plaintext.toString('utf8'));
    } catch {
      throw cursorError('list.cursor_invalid');
    }

    const payload = payloadSchema.safeParse(json);
    if (!payload.success) throw cursorError('list.cursor_invalid');
    if (payload.data.exp < this.now()) throw cursorError('list.cursor_expired');
    return payload.data.k;
  }
}
