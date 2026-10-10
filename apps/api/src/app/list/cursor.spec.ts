import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors/domain-error';
import { CursorCodec } from './cursor';

const codec = new CursorCodec('test-secret-test-secret-test-secret');
const SORT = '-createdAt,id';

function expectInvalid(run: () => unknown) {
  expect(run).toThrow(ValidationError);
  try {
    run();
  } catch (error) {
    expect(error).toMatchObject({ code: 'list.cursor_invalid' });
  }
}

describe('CursorCodec', () => {
  it('round-trips key values for the same sort', () => {
    const cursor = codec.encode(SORT, ['2026-10-01T08:00:00.000Z', 'p-17', 3, true]);

    expect(codec.decode(cursor, SORT)).toEqual(['2026-10-01T08:00:00.000Z', 'p-17', 3, true]);
  });

  it('produces an opaque, URL-safe token that does not expose values in clear text', () => {
    const cursor = codec.encode(SORT, ['Ali Khan', 'p-1']);

    expect(cursor).toMatch(/^[\w-]+\.[\w-]+$/);
    expect(cursor).not.toContain('Ali');
  });

  it('rejects a cursor whose payload was edited', () => {
    const cursor = codec.encode(SORT, ['2026-10-01T08:00:00.000Z', 'p-17']);
    const [, signature] = cursor.split('.');
    const forged = Buffer.from(
      JSON.stringify({ v: 1, s: SORT, k: ['2020-01-01T00:00:00.000Z', 'p-1'] }),
    ).toString('base64url');

    expectInvalid(() => codec.decode(`${forged}.${String(signature)}`, SORT));
  });

  it('rejects a cursor whose signature was edited', () => {
    const cursor = codec.encode(SORT, ['x', 'p-1']);
    const tampered = cursor.slice(0, -2) + (cursor.endsWith('AA') ? 'BB' : 'AA');

    expectInvalid(() => codec.decode(tampered, SORT));
  });

  it('rejects a cursor signed with another secret', () => {
    const other = new CursorCodec('another-secret-another-secret-12345');

    expectInvalid(() => codec.decode(other.encode(SORT, ['x', 'p-1']), SORT));
  });

  it('rejects a cursor issued for a different sort', () => {
    const cursor = codec.encode('name,id', ['Ali', 'p-1']);

    expectInvalid(() => codec.decode(cursor, SORT));
  });

  it.each(['', 'garbage', 'a.b.c', '!!!.###', `${'x'.repeat(10)}.`])(
    'rejects malformed cursor %j',
    (cursor) => {
      expectInvalid(() => codec.decode(cursor, SORT));
    },
  );

  it('refuses secrets too short to sign safely', () => {
    expect(() => new CursorCodec('short')).toThrow();
  });
});
