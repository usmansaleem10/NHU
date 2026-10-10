# C01 Patient Registration

## Purpose
Create a unique patient identity (MRN) once and find it fast on every visit. Correct demographics drive billing (patient type), legal documents (CNIC, guardian), safety (wristband, photo, thumbprint) and reporting.

## Users
Front desk, reception, ER registration, lab front desk.

## Screens in current app
| Menu | Route | Notes |
|---|---|---|
| Front Desk > Patient Registration-v3 | /patient/registration-v3 | Short form (quick registration) |
| Front Desk > Patient Registration (v2) | /patient/registration-v2 | Full form |

Side panel: patient search with types All, MRN, Name, Phone, CNIC, SAP ID, THUMB, Emp ID, and a recent patients list (name, MRN, patient type).

Buttons: Get Picture (webcam), Scan Thumb (biometric), Invoicing, Entitlement Invoicing, Update, Refresh, Save, Adjustments, Admission, Health Card, Wrist Band, Get Premium Membership (v2), See Radiologist Worklist (v2).

## Workflow
1. Search by phone/CNIC/MRN/thumb to avoid duplicates.
2. If not found, fill form and Save: MRN generated (format looks like YYMMNNNN, e.g. 2610xxxx).
3. From the same screen jump to Invoicing (C04), Entitlement Invoicing (panel/employee entitlement), Adjustments (C05), Admission (C08), print Health Card or Wrist Band.

## Data captured

### Quick form (v3)
| Field | api_name | Type | Req | Reason |
|---|---|---|---|---|
| Title | title | Mr, Mrs, Miss, B/O, D/O, Dr | | B/O (baby of) for newborns, D/O daughter of |
| First Name | first_name | text | yes | Identity |
| Last Name | last_name | text | | |
| Number | phone1 | text | yes | Primary lookup key in Pakistan, SMS |
| CNIC | patient_nic | text | config | National ID; can be made mandatory (enable_cnic_mandatory) |
| Gender | gender | Male, Female, Unidentified, Transgender | yes | Clinical and reporting; Unidentified for unknown ER patients |
| Age value and unit | pat_age_value, pat_age_type (years, months, days, hours) | | yes | Age often known instead of DOB; hours for neonates |
| Patient Type | patient_type_id | General, EFU Life... | | Drives price list and panel billing (C02) |
| City | city_id | select | | Demographics |
| Clinic | clinic_id | branch | yes | Registering branch |
| Address | address1 | text | | |
| Eligible for Charity? | is_zakat_eligible | checkbox | | Zakat/charity funded treatment (C22) |
| Guardian Name, Relation, CNIC, Contact | guardian_first_name, guardian_relationship, guardian_nic, guardian_phone | | | Minors, unconscious patients, legal consent |

### Full form (v2) adds
| Field | api_name | Reason |
|---|---|---|
| Guardian (father/husband name) | father_name | Printed on reports ("Father/Husband") |
| Blood group | blood_group | Safety, blood bank |
| Date of Birth | dob | |
| Contact type | phone1_type: Mobile, Landline, Home | |
| Ref./Old MRN | old_mrn | Migration from previous system |
| Email | email | Reports delivery |
| Nationality (passport) and Passport | passport_country_id, patient_passport | Foreigners |
| Emp/Std ID | sap_id | Employee or student patients (corporate/university panels) |
| Employee File No. | associated_emp_profile_no | Staff as patients (staff benefits) |
| Mother Tongue | mother_tongue | Communication, about 60 Pakistani languages |
| City, State, ZIP, Nationality, Location | city_id, state_id (req), zip_code, country_id (req), location_id | Address |
| Race, Ethnicity | race, ethnicity | Optional demographics (US style) |
| Company, Group | company_id, group_id | Panel hierarchy under patient type |
| Guardian MRN, Guardian Name, Guardian Relation | family_mrn, family_name, guardian_relationship | Link family members |
| MLC | mlc | Medico legal case flag (police cases) |
| Employment Status | Govt, Private, Self-employed, Unemployed, Others | Socio-economic |
| Account Status | Current, Saving, Default | Unclear, possibly membership |
| Written Contact Preference | Postal Mail, Email | |
| Alternate Contact | alternate_contact | |
| SSN | ssn | Unused locally (US template) |

## API endpoints observed
`/api/get_patients_registration_data`, `/api/v4/patients/get_patients_registration_data_optimized`, `/api/patient_types/login_user_patient_types/`, `/api/list_countries/`, `/api/list_states/`, `/api/list_cities/`, `/api/list_locations/`, `/api/lookups`, `/api/system_front_desk_control/`, `/api/system_front_desk_control/dynamic_front_desk_control_data/`, `/api/system_general_control/`, `/api/system_billing_control/`.

## Issues in current app
- Two registration forms with different field sets; US fields (SSN, race) mixed with Pakistan fields.
- No visible duplicate detection beyond manual search.
- Age stored as value plus unit rather than computed from DOB.

## Rebuild notes and extensions
- One form with configurable field sets per tenant (quick vs full), validation of CNIC (13 digits, 5-7-1) and phone formats.
- Duplicate detection (phonetic name, phone, CNIC, DOB) with merge workflow and audit.
- Unknown patient registration for ER (temporary identity, later merge).
- Family linking (household), newborn auto linking to mother (C18).
- Patient portal and self registration via QR/kiosk/WhatsApp before arrival.
- Consent capture (data processing, SMS opt in).
- Photo and biometric stored as attachments with privacy controls.
- Membership/loyalty (the "Premium Membership" button) as a proper module if needed.
- FHIR Patient resource mapping.

## Open questions
- MRN format and whether it resets yearly or per branch.
- What "Entitlement Invoicing" does exactly (likely staff/panel entitlements).
