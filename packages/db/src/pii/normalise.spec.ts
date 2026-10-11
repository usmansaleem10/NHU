import { describe, expect, it } from 'vitest';

import { InvalidPiiError, normaliseCnic, normalisePkPhone } from './normalise.js';

describe('normaliseCnic', () => {
  it.each(['35202-1234567-1', '35202 1234567 1', '3520212345671', ' 35202-1234567-1 '])(
    'normalises %j to 13 digits',
    (input) => {
      expect(normaliseCnic(input)).toBe('3520212345671');
    },
  );

  it.each(['35202-1234567', '35202-1234567-12', '3520212345a71', ''])('rejects %j', (input) => {
    expect(() => normaliseCnic(input)).toThrow(InvalidPiiError);
  });

  it('never echoes the value in the error', () => {
    expect(() => normaliseCnic('35202-123')).toThrow(/^Invalid cnic$/);
  });
});

describe('normalisePkPhone', () => {
  it.each([
    '03001234567',
    '0300-1234567',
    '3001234567',
    '923001234567',
    '+92 300 1234567',
    '+92-300-1234567',
    '00923001234567',
    '(0300) 123 4567',
  ])('normalises mobile %j to +923001234567', (input) => {
    expect(normalisePkPhone(input)).toBe('+923001234567');
  });

  it.each([
    ['042-35761234', '+924235761234'],
    ['051-9876543', '+92519876543'],
  ])('normalises landline %j to %s', (input, expected) => {
    expect(normalisePkPhone(input)).toBe(expected);
  });

  it.each([
    '+14155552671',
    '0300123',
    '0300123456', // mobile with 9 national digits: mobiles are exactly 10
    '030012345678',
    '00300-1234567',
    'phone',
    '+92 0300 1234567',
  ])('rejects %j', (input) => {
    expect(() => normalisePkPhone(input)).toThrow(InvalidPiiError);
  });
});
