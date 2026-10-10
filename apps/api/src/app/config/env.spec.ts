import { describe, expect, it } from 'vitest';

import { EnvValidationError, loadEnv } from './env';

describe('loadEnv', () => {
  it('applies defaults for a minimal environment', () => {
    const env = loadEnv({});

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      HOST: '0.0.0.0',
      PORT: 3000,
      LOG_LEVEL: 'info',
    });
  });

  it('coerces PORT from its string form', () => {
    expect(loadEnv({ PORT: '4100' }).PORT).toBe(4100);
  });

  it.each([
    ['PORT', 'not-a-port'],
    ['PORT', '70000'],
    ['PORT', '0'],
    ['NODE_ENV', 'staging'],
    ['LOG_LEVEL', 'verbose'],
  ])('fails fast when %s=%s', (key, value) => {
    expect(() => loadEnv({ [key]: value })).toThrow(EnvValidationError);
  });

  it('reports every invalid variable at once, by name, without echoing values', () => {
    const secretLookingValue = 'p@ssw0rd-should-not-leak';

    let error: unknown;
    try {
      loadEnv({ PORT: secretLookingValue, LOG_LEVEL: 'loud' });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(EnvValidationError);
    const { message, issues } = error as EnvValidationError;
    expect(issues.map((issue) => issue.variable).sort()).toEqual(['LOG_LEVEL', 'PORT']);
    expect(message).toContain('PORT');
    expect(message).toContain('LOG_LEVEL');
    expect(message).not.toContain(secretLookingValue);
  });
});
