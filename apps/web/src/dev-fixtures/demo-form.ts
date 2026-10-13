/**
 * DEV FIXTURE — not production data. Fake endpoints behind the form-kit reference screen:
 * a department typeahead search over 300 generated departments and a submit endpoint that
 * answers like the real API's problem+json validation (RFC 9457 `errors` array).
 */
import { ProblemError, type TypeaheadOption, type TypeaheadSearch } from '@hims/ui';

import type { DemoRegistration } from '../features/foundation';

const DEPARTMENTS: TypeaheadOption[] = Array.from({ length: 300 }, (_, i) => {
  const n = String(i + 1).padStart(3, '0');
  return {
    value: `dep-${n}`,
    label: `Department ${n}`,
    description: `Floor ${String((i % 6) + 1)}`,
  };
});

function later<T>(value: () => T, ms: number, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        resolve(value());
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    }, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('aborted'));
    });
  });
}

/** GET /api/v1/departments?search=&limit= — server-side search, never the full list. */
export const searchDepartments: TypeaheadSearch = (query, { signal, limit }) =>
  later(
    () =>
      DEPARTMENTS.filter((d) => d.label.toLowerCase().includes(query.toLowerCase())).slice(
        0,
        limit,
      ),
    200,
    signal,
  );

/**
 * POST /api/v1/demo-registrations. Rejects like the real API will:
 *  - email "taken@example.com" → 422 with a field error on /email
 *  - department "dep-013" → 422 with an error on /branchId (not a form field → form-level)
 */
export function submitDemoRegistration(input: DemoRegistration): Promise<{ id: string }> {
  return later(() => {
    const errors: { pointer: string; message: string; code: string }[] = [];
    if (input.email.toLowerCase() === 'taken@example.com') {
      errors.push({ pointer: '/email', message: 'forms.server.emailTaken', code: 'duplicate' });
    }
    if (input.departmentId === 'dep-013') {
      errors.push({ pointer: '/branchId', message: 'forms.server.branchClosed', code: 'closed' });
    }
    if (errors.length > 0) {
      throw new ProblemError({ status: 422, title: 'Validation failed', errors });
    }
    return { id: crypto.randomUUID() };
  }, 300);
}
