import { describe, expect, it } from 'vitest';

import { resolvePersona } from './session';

describe('resolvePersona (dev fixture)', () => {
  it('defaults to the least-privileged persona when none is chosen', () => {
    expect(resolvePersona(null).user.displayName).toBe('Demo Nurse');
  });

  it('refuses an unknown persona instead of falling back to admin (fail closed)', () => {
    expect(() => resolvePersona('root')).toThrow(/Unknown dev persona/);
    expect(() => resolvePersona('__proto__')).toThrow(/Unknown dev persona/);
  });

  it('returns the requested persona', () => {
    expect(resolvePersona('admin').user.displayName).toBe('Demo Admin');
  });
});
