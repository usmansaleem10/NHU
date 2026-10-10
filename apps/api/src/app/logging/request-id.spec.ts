import { describe, expect, it } from 'vitest';

import { resolveRequestId } from './request-id';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('resolveRequestId', () => {
  it('propagates a well-formed incoming id', () => {
    expect(resolveRequestId('lb-7f3a.c2_9')).toBe('lb-7f3a.c2_9');
  });

  it('generates a UUID when the header is missing or empty', () => {
    expect(resolveRequestId(undefined)).toMatch(UUID);
    expect(resolveRequestId('')).toMatch(UUID);
  });

  it('generates distinct ids per request', () => {
    expect(resolveRequestId(undefined)).not.toBe(resolveRequestId(undefined));
  });

  it.each([
    ['log injection', 'abc\n{"level":60}'],
    ['spaces', 'abc def'],
    ['over-long values', 'a'.repeat(129)],
  ])('replaces an unsafe incoming id (%s)', (_case, header) => {
    expect(resolveRequestId(header)).toMatch(UUID);
  });

  it('uses the first value when the header is repeated', () => {
    expect(resolveRequestId(['first-id', 'second-id'])).toBe('first-id');
  });
});
