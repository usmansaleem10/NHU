import { describe, expect, it } from 'vitest';

import { formatCnicInput, normalizePatientQuery, validatePatientQuery } from './query.js';

describe('formatCnicInput', () => {
  it.each([
    ['3', '3'],
    ['35202', '35202'],
    ['352021', '35202-1'],
    ['352021234567', '35202-1234567'],
    ['3520212345671', '35202-1234567-1'],
    ['35202-1234567-1999', '35202-1234567-1'],
    ['35202 12345 671', '35202-1234567-1'],
    ['ab35c202', '35202'],
  ])('masks %j as %j (5-7-1)', (raw, expected) => {
    expect(formatCnicInput(raw)).toBe(expected);
  });
});

describe('normalizePatientQuery + validatePatientQuery', () => {
  it('strips CNIC dashes and requires exactly 13 digits', () => {
    const q = normalizePatientQuery('cnic', '35202-1234567-1');
    expect(q.value).toBe('3520212345671');
    expect(validatePatientQuery(q)).toBeNull();
    expect(validatePatientQuery(normalizePatientQuery('cnic', '35202-123'))).toEqual({
      key: 'patientSearch.error.cnic',
    });
  });

  it('treats +92 and 0 prefixed mobile numbers as the same number', () => {
    expect(normalizePatientQuery('phone', '+92 300 1234567').value).toBe('03001234567');
    expect(normalizePatientQuery('phone', '0300-1234567').value).toBe('03001234567');
    expect(validatePatientQuery(normalizePatientQuery('phone', '12-34'))).toEqual({
      key: 'patientSearch.error.phone',
    });
  });

  it('collapses whitespace in names and needs two characters', () => {
    expect(normalizePatientQuery('name', '  Ali   Khan ').value).toBe('Ali Khan');
    expect(validatePatientQuery(normalizePatientQuery('name', ' A '))).toEqual({
      key: 'patientSearch.error.tooShort',
      count: 2,
    });
  });

  it('upper-cases identifiers so mr-12 and MR-12 hit the same record', () => {
    expect(normalizePatientQuery('mrn', ' mr-000123 ').value).toBe('MR-000123');
  });
});
