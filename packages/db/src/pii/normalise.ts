import { DbError } from '../errors.js';

/** A PII value failed validation. The message never contains the value (AGENTS.md rule 10). */
export class InvalidPiiError extends DbError {
  readonly code = 'INVALID_PII';

  constructor(readonly field: 'cnic' | 'phone') {
    super(`Invalid ${field}`);
  }
}

/**
 * CNIC -> its 13 digits. Accepts "35202-1234567-1", "35202 1234567 1" or "3520212345671".
 * Blind indexes are computed on this form, so every spelling finds the same record.
 */
export function normaliseCnic(input: string): string {
  const digits = input.replace(/[\s-]/g, '');
  if (!/^\d{13}$/.test(digits)) throw new InvalidPiiError('cnic');
  return digits;
}

/**
 * Pakistani phone -> E.164 (+92 followed by the national number without its trunk 0).
 * Accepts 0300-1234567, 03001234567, 3001234567, 923001234567, +92 300 1234567, 0092...,
 * and landlines such as 042-35761234 or 051-9876543. National numbers are 9-10 digits.
 */
export function normalisePkPhone(input: string): string {
  const compact = input.replace(/[\s\-().]/g, '');
  if (!/^\+?\d+$/.test(compact)) throw new InvalidPiiError('phone');

  let national: string;
  if (compact.startsWith('+92')) national = compact.slice(3);
  else if (compact.startsWith('+')) throw new InvalidPiiError('phone');
  else if (compact.startsWith('0092')) national = compact.slice(4);
  else if (compact.startsWith('92') && compact.length >= 11) national = compact.slice(2);
  else if (compact.startsWith('0')) national = compact.slice(1);
  else national = compact;

  if (!/^[1-9]\d{8,9}$/.test(national)) throw new InvalidPiiError('phone');
  return `+92${national}`;
}
