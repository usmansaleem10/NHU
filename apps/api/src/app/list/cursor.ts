import { createHmac, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import { ValidationError } from '../errors/domain-error';

export type CursorValue = string | number | boolean;

const MIN_SECRET_LENGTH = 32;
const SIGNATURE_BYTES = 16;

const payloadSchema = z.strictObject({
  v: z.literal(1),
  /** Sort signature the cursor was issued for, e.g. `-createdAt,id`. */
  s: z.string(),
  /** Key values of the last row of the page, in sort order. */
  k: z.array(z.union([z.string(), z.number(), z.boolean()])).max(8),
});

function invalidCursor(): ValidationError {
  return new ValidationError('list.cursor_invalid', 'The page cursor is invalid or expired', {
    errors: [{ path: 'cursor', message: 'Invalid cursor' }],
  });
}

/**
 * Opaque keyset cursor: base64url(JSON payload) + "." + HMAC-SHA256 signature. Signing stops
 * clients from crafting positions; binding to the sort stops reuse across differently sorted
 * listings. Any tampering decodes to a 400 `list.cursor_invalid`.
 */
export class CursorCodec {
  constructor(private readonly secret: string) {
    if (secret.length < MIN_SECRET_LENGTH) {
      throw new Error(`Cursor secret must be at least ${String(MIN_SECRET_LENGTH)} characters`);
    }
  }

  encode(sortSignature: string, key: readonly CursorValue[]): string {
    const body = Buffer.from(JSON.stringify({ v: 1, s: sortSignature, k: key })).toString(
      'base64url',
    );
    return `${body}.${this.sign(body).toString('base64url')}`;
  }

  decode(cursor: string, sortSignature: string): CursorValue[] {
    const parts = cursor.split('.');
    const [body, signature] = parts;
    if (parts.length !== 2 || !body || !signature) throw invalidCursor();

    const expected = this.sign(body);
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw invalidCursor();
    }

    let json: unknown;
    try {
      json = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
      throw invalidCursor();
    }
    const payload = payloadSchema.safeParse(json);
    if (!payload.success || payload.data.s !== sortSignature) throw invalidCursor();
    return payload.data.k;
  }

  private sign(body: string): Buffer {
    return createHmac('sha256', this.secret).update(body).digest().subarray(0, SIGNATURE_BYTES);
  }
}
