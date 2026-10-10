# C02 Patient Types, Panels and Companies

## Purpose
Classify who pays. A "General" (private, self pay) patient pays at the counter; a "panel" patient (insurer such as EFU Life, a corporate, government scheme) is billed to a company at panel rates, often on credit, then claimed (C21). Patient type selects the price list and controls approvals.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Settings > Patient Type | /configuration/patient-type-v2 | Tabs Patient Types, Companies, Groups. Columns ID, Name, Status, Action; button "Patient Types Config" |

## Data captured
| Entity | Fields | Reason |
|---|---|---|
| Patient type | id, name, status, config (panel or not) | Top level payer class. Observed: General, EFU Life |
| Company | name, patient type | Employer/insurer under the type |
| Group | name, company | Plan or employee group under company |
| Tags | `/api/v4/tags` | Extra panel tagging in reports |

Hierarchy: Patient Type > Company > Group. Patient record stores patient_type_id, company_id, group_id.

## Where it is used
- Pricing per patient type (C03), "Replicate Service price On" patient types.
- Product patient type and fixed POS discount (S01).
- Users allocated to patient types (only see allocated panels).
- Reports: Panel Wise Report, Transaction wise Report (panel / non panel), Patient Admission Wise (current vs admitted patient type).
- Claims (C21) by company.

## API endpoints observed
`/api/get_patient_type`, `/api/patient_types`, `/api/v4/patient_types`, `/api/patient_type_optimize`, `/api/panel_patient_types/`, `/api/v4/panel_patient_types/get_panel_patient_types`, `/api/get_panel_patient_types/`.

## Rebuild notes and extensions
- Rename to **Payer** model: Payer (insurer, corporate, government, self) > Plan > Policy/Member (patient coverage with member ID, validity, limits, co-pay, covered services, pre-authorization rules).
- Patient can hold multiple coverages with priority; payer can change during an admission (current vs admitted payer is already a report concept).
- Contracts: price list per payer, package rates, discount agreements, exclusions.
- Eligibility check and pre authorization workflow before admission or expensive procedures.
- Credit limit and outstanding tracking per payer.

## Open questions
- What "Patient Types Config" contains (credit flags, approval, discount limits).
