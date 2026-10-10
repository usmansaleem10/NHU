# C17 Dialysis

## Purpose
Haemodialysis units run recurring sessions for chronic kidney patients: scheduling chairs, recording each session, billing per session (often panel or charity funded).

## Screens in current app
| Menu | Route | Status |
|---|---|---|
| Dialysis > Patient Dialysis | /dialysis/patient-dialysis | Dead route (redirects to dashboard) |

Other evidence: "Dialysis Req." button on OPD form, DialysisService service type, Dialysis ward on the 3rd floor, nephrology ledger in billing.

## Rebuild notes
- Recurring schedule per patient (e.g. Mon/Wed/Fri shift 2) on machines/chairs.
- Session record: pre and post weight, vitals, access type (AV fistula, catheter), dialyzer and reuse count, duration, UF goal, heparin, complications, nurse.
- Consumables auto deducted from dialysis store; session charge auto billed.
- Monthly labs tracking (Hb, URR/Kt/V), hepatitis status segregation of machines.
- Patient app reminders.

## Open questions
- Is dialysis currently done through OPD services and wards only, since the screen is broken?
