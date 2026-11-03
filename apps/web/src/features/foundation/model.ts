/** Row shape of the data-table reference screen (GET /api/v1/patients list endpoint). */
export interface DemoPatient {
  id: string;
  mrn: string;
  name: string;
  gender: 'female' | 'male';
  ward: string;
  /** ISO instant (UTC). */
  admittedAt: string;
  status: 'admitted' | 'discharged' | 'transferred';
  /** Money as a decimal string (AGENTS.md rule 9). */
  balance: string;
}

/** Ward filter options. Reference data; comes from the reference-data service once it exists. */
export const DEMO_WARDS = ['Ward A', 'Ward B', 'Ward C', 'ICU', 'CCU', 'Maternity'] as const;

/** Body of the form-kit reference submit (POST /api/v1/demo-registrations). */
export interface DemoRegistration {
  fullName: string;
  email: string;
  departmentId: string;
}
