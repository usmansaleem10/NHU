/**
 * Patient search query rules (F0-UI-07). Pure functions so the C01 registration screen and the
 * API use the same normalisation.
 */
export const PATIENT_SEARCH_TYPES = [
  'mrn',
  'name',
  'phone',
  'cnic',
  'employeeId',
  'admissionId',
] as const;

export type PatientSearchType = (typeof PATIENT_SEARCH_TYPES)[number];

export interface PatientSearchQuery {
  type: PatientSearchType;
  /** Normalised value: CNIC/phone digits only, others trimmed. */
  value: string;
}

export interface PatientSearchResult {
  id: string;
  mrn: string;
  name: string;
  /** Pre-formatted secondary line (age/sex, masked phone/CNIC...) supplied by the API. */
  details?: string;
}

/** Formats raw keystrokes as a Pakistani CNIC: 5-7-1 digits, e.g. 12345-1234567-1. */
export function formatCnicInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function normalizePatientQuery(type: PatientSearchType, input: string): PatientSearchQuery {
  const trimmed = input.trim();
  if (type === 'cnic') return { type, value: trimmed.replace(/\D/g, '') };
  if (type === 'phone') {
    const digits = trimmed.replace(/\D/g, '');
    // +92 3xx… and 03xx… are the same mobile number.
    return {
      type,
      value: digits.startsWith('92') && digits.length === 12 ? `0${digits.slice(2)}` : digits,
    };
  }
  if (type === 'name') return { type, value: trimmed.replace(/\s+/g, ' ') };
  return { type, value: trimmed.toUpperCase() };
}

export type PatientQueryError =
  | { key: 'patientSearch.error.cnic' }
  | { key: 'patientSearch.error.phone' }
  | { key: 'patientSearch.error.tooShort'; count: number };

/** Returns why a query can't be sent yet, or null when it is valid. */
export function validatePatientQuery(query: PatientSearchQuery): PatientQueryError | null {
  switch (query.type) {
    case 'cnic':
      return query.value.length === 13 ? null : { key: 'patientSearch.error.cnic' };
    case 'phone':
      return query.value.length >= 7 ? null : { key: 'patientSearch.error.phone' };
    case 'name':
      return query.value.length >= 2 ? null : { key: 'patientSearch.error.tooShort', count: 2 };
    default:
      return query.value.length >= 1 ? null : { key: 'patientSearch.error.tooShort', count: 1 };
  }
}
