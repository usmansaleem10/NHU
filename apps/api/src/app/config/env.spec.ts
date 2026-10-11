import { describe, expect, it } from 'vitest';

import { EnvValidationError, loadEnv } from './env';

describe('loadEnv', () => {
  it('applies defaults for a minimal environment', () => {
    const env = loadEnv({ NODE_ENV: 'development' });

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      HOST: '0.0.0.0',
      PORT: 3000,
      LOG_LEVEL: 'info',
      TRUST_PROXY_REQUEST_ID: false,
      READINESS_CACHE_MS: 1000,
    });
  });

  it('requires NODE_ENV explicitly (no silent development default)', () => {
    expect(() => loadEnv({})).toThrow(/NODE_ENV/);
  });

  it('coerces PORT from its string form', () => {
    expect(loadEnv({ NODE_ENV: 'test', PORT: '4100' }).PORT).toBe(4100);
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('parses TRUST_PROXY_REQUEST_ID=%s', (value, expected) => {
    expect(
      loadEnv({ NODE_ENV: 'test', TRUST_PROXY_REQUEST_ID: value }).TRUST_PROXY_REQUEST_ID,
    ).toBe(expected);
  });

  it.each([
    ['PORT', 'not-a-port'],
    ['PORT', '70000'],
    ['PORT', '0'],
    ['NODE_ENV', 'staging'],
    ['LOG_LEVEL', 'verbose'],
    ['TRUST_PROXY_REQUEST_ID', 'yes'],
  ])('fails fast when %s=%s', (key, value) => {
    expect(() => loadEnv({ NODE_ENV: 'test', [key]: value })).toThrow(EnvValidationError);
  });

  it('reports every invalid variable at once, by name, without echoing values', () => {
    const secretLookingValue = 'p@ssw0rd-should-not-leak';

    let error: unknown;
    try {
      loadEnv({ NODE_ENV: 'test', PORT: secretLookingValue, LOG_LEVEL: 'loud' });
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

  it('requires a cursor-signing secret of 32+ characters in production', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(/CURSOR_SECRET/);
    expect(() => loadEnv({ NODE_ENV: 'production', CURSOR_SECRET: 'short' })).toThrow(
      /CURSOR_SECRET/,
    );
    expect(
      loadEnv({ NODE_ENV: 'production', CURSOR_SECRET: 'x'.repeat(32) }).CURSOR_SECRET,
    ).toHaveLength(32);
  });

  it('defaults cursor lifetime to 24 hours and accepts an override', () => {
    expect(loadEnv({ NODE_ENV: 'test' }).CURSOR_TTL_SECONDS).toBe(86_400);
    expect(loadEnv({ NODE_ENV: 'test', CURSOR_TTL_SECONDS: '600' }).CURSOR_TTL_SECONDS).toBe(600);
    expect(() => loadEnv({ NODE_ENV: 'test', CURSOR_TTL_SECONDS: '0' })).toThrow(
      /CURSOR_TTL_SECONDS/,
    );
  });

  it('lets development run without a cursor secret', () => {
    expect(loadEnv({ NODE_ENV: 'development' }).CURSOR_SECRET).toBeUndefined();
  });
});
