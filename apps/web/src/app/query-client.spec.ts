import { ProblemError } from '@hims/ui';
import { describe, expect, it } from 'vitest';

import { HttpError } from './api/http';
import { shouldRetry } from './query-client';

describe('shouldRetry', () => {
  it.each([
    ['problem 422', new ProblemError({ status: 422, title: 'Invalid' })],
    ['problem 403', new ProblemError({ status: 403, title: 'Forbidden' })],
    ['plain HTTP 401 (no problem body)', new HttpError(401)],
    ['plain HTTP 404', new HttpError(404)],
  ])('never retries a client error: %s', (_name, error) => {
    expect(shouldRetry(0, error)).toBe(false);
  });

  it('retries server and network failures twice', () => {
    expect(shouldRetry(0, new HttpError(503))).toBe(true);
    expect(shouldRetry(1, new TypeError('Failed to fetch'))).toBe(true);
    expect(shouldRetry(2, new HttpError(503))).toBe(false);
  });
});
