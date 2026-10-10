import { describe, expect, it } from 'vitest';

import { mapProblemToFields, problemFrom, ProblemError } from './problem.js';

const fields = new Set(['code', 'name', 'address.city', 'contacts.0.phone']);
const isField = (n: string) => fields.has(n);

describe('mapProblemToFields', () => {
  it('maps pointer, path and field forms onto react-hook-form names', () => {
    const mapped = mapProblemToFields(
      {
        status: 422,
        errors: [
          { pointer: '/code', message: 'Code already exists', code: 'duplicate' },
          { path: ['address', 'city'], message: 'Unknown city' },
          { pointer: '#/contacts/0/phone', message: 'Invalid phone' },
          { field: 'name', message: 'Too long' },
        ],
      },
      isField,
    );
    expect(mapped).toEqual({
      fieldErrors: {
        code: 'Code already exists',
        'address.city': 'Unknown city',
        'contacts.0.phone': 'Invalid phone',
        name: 'Too long',
      },
      formErrors: [],
    });
  });

  it('accepts the map form and keeps only the first message per field', () => {
    const mapped = mapProblemToFields(
      { errors: { code: ['Required', 'Too short'], 'address.city': 'Unknown city' } },
      isField,
    );
    expect(mapped.fieldErrors).toEqual({ code: 'Required', 'address.city': 'Unknown city' });
  });

  it('sends errors for fields not on this form to the form-level list', () => {
    const mapped = mapProblemToFields(
      {
        errors: [
          { pointer: '/branchId', message: 'Branch is closed' },
          { pointer: '/code', message: 'Taken' },
        ],
      },
      isField,
    );
    expect(mapped).toEqual({ fieldErrors: { code: 'Taken' }, formErrors: ['Branch is closed'] });
  });

  it('falls back to detail/title when there are no field errors', () => {
    expect(
      mapProblemToFields(
        { status: 409, title: 'Conflict', detail: 'Record was changed by someone else' },
        isField,
      ),
    ).toEqual({ fieldErrors: {}, formErrors: ['Record was changed by someone else'] });
  });
});

describe('problemFrom', () => {
  it('recognises ProblemError and raw problem objects but not ordinary errors', () => {
    expect(problemFrom(new ProblemError({ status: 422, title: 'Invalid' }))?.status).toBe(422);
    expect(problemFrom({ status: 400, title: 'Bad' })?.title).toBe('Bad');
    expect(problemFrom(new TypeError('Failed to fetch'))).toBeNull();
  });
});
