# C08 Admission, Wards and Beds (ADT)

## Purpose
Admit a patient to a ward and bed under a consultant, capture next of kin and package, track bed occupancy, and support transfer and discharge. Admission opens the IPD encounter that collects all inpatient charges.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Front Desk > Patient Admission | /patient/admission-v2 | Sections Referring, Next of kin; signature pad (Update Signature, Clear); Draft; patient list |
| In-patient > Ward Management | /ward/management-v2 | Tabs Wards (code, Ward/Room, Floor, Action), Beds (Code, Bed/Room Name, Type, Status); Add |
| Front Desk > Current Bed Status Report V2 | /reports/bed-status-report-v2 | Filters doctor, department, ward, patient type, admitted by, bed allocation (with/without bed) |
| Analytics > Ward Dashboard | /dashboard/ward | Bed map |
| IPD worklist buttons | /ipd/v2 | Transfer, Adm Hist |

## Data captured (admission)
| Field | api_name | Req | Reason |
|---|---|---|---|
| Doctor | doctor_id | | Admitting consultant, accountable for care and share |
| Admitted To | referred_to (department) | yes | Specialty |
| Sub department | sub_department_id | | |
| Refer From | referred_from (department) | yes | Source (OPD clinic, ER) for referral stats |
| Ward | ward_id | yes | Dialysis, Emergency Ward, General Ward, HDU, ICU, NICU 1/2, Nursery, PICU, Private Rooms |
| Bed | bed_id | | Can admit without bed (report "without bed allocated") |
| Procedure | procedure_id | | Planned surgery/package (Appendectomy, BTL...) |
| Package Amount | package_amount | | Fixed price package agreed at admission |
| Additional Ward / Bed | additional_ward_id, additional_bed_id | | Mother and baby, attendant bed |
| Ref. Visit ID | ref_visit | | Link to OPD/ER visit; used in claims |
| Kin name, CNIC, phone, relation, address | attendent_name (req), attendent_nic, attendent_mobile (req), attendent_relationship, attendent_address | | Consent, contact, legal |
| Duty Doctor | medical_officer_id | | Resident/MO responsible |
| Condition | Stable, Unstable, Critical | | Triage at admission |
| Comments | comments | | |
| Signature | pad | | Consent signature |
| Documents | document_types | | Upload CNIC, referral |

Discharge conditions seen in reports: Stable, Normal, Refer To, Deceased, LAMA, Discharged on Request, Cancel Admission. Discharge types: Normal, LAMA, Referral, Deceased.

## API endpoints observed
`/api/admissions/`, `/api/active_ward_beds/`, `/api/get_ipd_doctors`, `/api/get_ipd_departments/`, `/api/services_by_type`, `/api/document_types`, `/api/active_wards`, `/api/v4/wards/active_wards`, `/api/v4/beds/filter_by_status`.

## Rebuild notes and extensions
- Bed board (visual, real time) with statuses: vacant clean, vacant dirty (housekeeping), occupied, reserved, blocked, maintenance.
- Admission request from OPD/ER doctor, bed request queue, bed allocation by bed manager.
- Transfers (ward, bed, consultant) as events with timestamps for accurate bed day billing.
- Discharge workflow: discharge order, medicines to take home, discharge summary (template), billing clearance, gate pass, bed release to housekeeping.
- Bed classes linked to price lists (general, semi private, private, ICU).
- Pre admission and day care admissions.
- Estimated cost at admission for panel pre-auth and patient counselling.
- Census reports at midnight; ALOS, occupancy, turnover.
