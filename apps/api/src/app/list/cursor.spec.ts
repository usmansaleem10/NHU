import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors/domain-error';
import type { CursorBinding } from './cursor';
import { CursorCodec } from './cursor';

const SECRET = 'test-secret-test-secret-test-secret';
const HOUR = 3_600_000;

let now = Date.UTC(2026, 9, 11, 8);
const clock = () => now;
const codec = new CursorCodec(SECRET, { ttlMs: HOUR, now: clock });

const binding: CursorBinding = {
  resource: 'patients',
  scope: { tenantId: 'tenant-a', userId: 'user-1' },
  sort: '-createdAt,id',
  filter: { status: 'active' },
};

function decodeError(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

function expectRejected(run: () => unknown, code = 'list.cursor_invalid') {
  const error = decodeError(run);
  expect(error).toBeInstanceOf(ValidationError);
  expect(error).toMatchObject({ code });
}

describe('CursorCodec', () => {
  it('round-trips key values for the same binding', () => {
    const cursor = codec.encode(binding, ['2026-10-01 08:00:00.123456+00', 'p-17', 3, true]);

    expect(codec.decode(cursor, binding)).toEqual([
      '2026-10-01 08:00:00.123456+00',
      'p-17',
      3,
      true,
    ]);
  });

  it('encrypts the key: values are not recoverable from the token without the secret', () => {
    const cursor = codec.encode(binding, ['Ali Khan', 'p-1']);
    const bytes = Buffer.from(cursor, 'base64url');

    expect(cursor).toMatch(/^[\w-]+$/);
    expect(bytes.toString('latin1')).not.toContain('Ali Khan');
    expect(bytes.toString('latin1')).not.toContain('p-1');
    expectRejected(() =>
      new CursorCodec('another-secret-another-secret-12345', { now: clock }).decode(
        cursor,
        binding,
      ),
    );
  });

  it('uses a fresh IV, so equal positions do not produce equal tokens', () => {
    expect(codec.encode(binding, ['x', 'p-1'])).not.toBe(codec.encode(binding, ['x', 'p-1']));
  });

  it.each([
    ['another tenant', { scope: { tenantId: 'tenant-b', userId: 'user-1' } }],
    ['another user', { scope: { tenantId: 'tenant-a', userId: 'user-2' } }],
    ['another resource', { resource: 'invoices' }],
    ['another sort', { sort: 'name,id' }],
    ['another filter', { filter: { status: 'inactive' } }],
  ])('rejects a cursor replayed against %s', (_case, change) => {
    const cursor = codec.encode(binding, ['x', 'p-1']);

    expectRejected(() => codec.decode(cursor, { ...binding, ...change }));
  });

  it('binds filters by value, not by key order', () => {
    const cursor = codec.encode({ ...binding, filter: { a: 1, b: { c: 2, d: 3 } } }, ['x']);

    expect(codec.decode(cursor, { ...binding, filter: { b: { d: 3, c: 2 }, a: 1 } })).toEqual([
      'x',
    ]);
  });

  it('expires cursors after the configured lifetime', () => {
    const issuedAt = now;
    const cursor = codec.encode(binding, ['x', 'p-1']);

    now = issuedAt + HOUR - 1;
    expect(codec.decode(cursor, binding)).toEqual(['x', 'p-1']);

    now = issuedAt + HOUR + 1;
    expectRejected(() => codec.decode(cursor, binding), 'list.cursor_expired');
    now = issuedAt;
  });

  it('rejects any modified byte', () => {
    const bytes = Buffer.from(codec.encode(binding, ['x', 'p-1']), 'base64url');
    for (const index of [0, 12, bytes.length - 1]) {
      const tampered = Buffer.from(bytes);
      tampered[index] = (tampered[index] ?? 0) ^ 0x01;

      expectRejected(() => codec.decode(tampered.toString('base64url'), binding));
    }
  });

  it.each(['', 'garbage', '!!!', 'a'.repeat(10)])('rejects malformed cursor %j', (cursor) => {
    expectRejected(() => codec.decode(cursor, binding));
  });

  it('refuses secrets too short to derive a key from', () => {
    expect(() => new CursorCodec('short')).toThrow();
  });
});
