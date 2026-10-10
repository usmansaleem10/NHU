# C21 Claims Management

## Purpose
Panel (insurer or corporate) patients are treated on credit; the hospital submits claims per admission or visit and tracks payment.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Claim Management > Claim Management | /sale/claim-management | Filters From/To, Company (patient type), Admission Number, Ref. Visit ID, Status (Pending/Completed) |

Finance mapping has a "Claim Management" tab in Payment Mode COA.

## API endpoints observed
`/api/v4/admissions/claim_admission_data`, `/api/admissions/get_ref_visit/`, `/api/v4/patient_types`.

## Rebuild notes and extensions
- Claim lifecycle: draft from final settlement > attach documents (discharge summary, bills, reports, pre-auth) > submit (batch per payer) > acknowledgement > query/rejection handling > partial/full payment > write off of disallowed amounts.
- Pre-authorization requests and approvals before admission.
- Payer specific claim forms and electronic submission where available (e.g. Sehat Card program portals).
- Ageing of receivables per payer, denial reasons analytics.
- Remittance posting matching payments to claims.
