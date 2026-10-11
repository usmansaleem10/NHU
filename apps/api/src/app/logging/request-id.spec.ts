import { describe, expect, it } from 'vitest';

import { resolveRequestId, upstreamRequestId } from './request-id';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('resolveRequestId', () => {
  it('always mints its own id when upstream ids are not trusted', () => {
    expect(resolveRequestId('lb-7f3a.c2_9', false)).toMatch(UUID);
  });

  it('propagates a well-formed incoming id from a trusted proxy', () => {
    expect(resolveRequestId('lb-7f3a.c2_9', true)).toBe('lb-7f3a.c2_9');
  });

  it('uses the first value when a trusted header is repeated', () => {
    expect(resolveRequestId(['first-id', 'second-id'], true)).toBe('first-id');
  });

  it('generates distinct UUIDs when the header is missing', () => {
    expect(resolveRequestId(undefined, true)).toMatch(UUID);
    expect(resolveRequestId(undefined, true)).not.toBe(resolveRequestId(undefined, true));
  });

  it.each([
    ['empty', ''],
    ['log injection', 'abc\n{"level":60}'],
    ['spaces', 'abc def'],
    ['over-long values', 'a'.repeat(129)],
  ])('replaces an unsafe trusted id (%s)', (_case, header) => {
    expect(resolveRequestId(header, true)).toMatch(UUID);
  });
});

describe('upstreamRequestId', () => {
  it('returns a safe incoming id for logging as upstreamRequestId', () => {
    expect(upstreamRequestId('gateway-42')).toBe('gateway-42');
  });

  it('drops unsafe or missing ids', () => {
    expect(upstreamRequestId('abc\ndef')).toBeUndefined();
    expect(upstreamRequestId(undefined)).toBeUndefined();
  });
});
