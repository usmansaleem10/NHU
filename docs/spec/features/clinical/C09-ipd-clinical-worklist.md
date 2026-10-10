# C09 IPD Clinical Worklist

## Purpose
The inpatient chart used by doctors and nurses on the ward: record vitals each shift, doctor visits (billable), nursing and doctor notes, investigations, diagnosis, allergies, and order services and medicines.

## Users
Ward nurses, nursing head, consultants, medical officers.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| In-patient > IPD | /ipd/v2 | Sections Vitals, Doctor Visit, Investigations, Diagnosis, Current Diagnosis, Nursing Notes, Doctor Notes, Allergies; Patient List filtered by user wards and department; search by MRN, Name, Phone, CNIC, SAP ID, Doctor Name |
| Settings > Intake / Outtake | /configuration/intake-output-config | Fluid intake/output items: Code, Name, Method, Type, Status |

Action buttons: Submit, Transfer, Assessment, Prescription, Reminder, Op Theater (OT request), Patient Hist., Adm Hist, Word Instructions.

## Data captured
| Section | Fields | Reason |
|---|---|---|
| Vitals | temperature, bp_systolic, bp_diastolic, pulse, shift (Morning, Evening, Night), notes | Monitoring per nursing shift |
| Doctor Visit | doctor_id, visit_type_id, doctor_type (Consultant, Visiting, Surgeon), Bill checkbox | Consultant rounds are billable visits and feed doctor share |
| Investigations | service type (Radiology, LabInvestigation, MiscService, Donation, Product, DialysisService, OtService...), service, referring doctor | Orders to lab, radiology, procedures; table Investigations, Report, Status |
| Diagnosis | search ICD, type (Provisional, Differential, Final), notes | Clinical coding and discharge summary |
| Nursing Notes | shift (req), notes | Nursing documentation |
| Doctor Notes | notes | Progress notes |
| Allergies | allergy list | Safety |
| Intake/Output | configured items | Fluid balance |

## API endpoints observed
`/api/get_patients_by_type_optimized/`, `/api/current_user_wards/`, `/api/get_opd_doctors`, `/api/service_type_configurator/`, `/api/configurator_types`.

## Rebuild notes and extensions
- Electronic MAR (medication administration record) with scheduled doses, barcode scanning of patient wristband and medicine, missed dose alerts.
- Nursing care plans, assessments (falls risk, Braden, pain scores, GCS), early warning score (NEWS2) computed from vitals with alerts.
- Vitals charting and trends; device integration for monitors.
- Fluid balance chart with totals per 24h.
- Handover (SBAR) between shifts.
- Order sets (post op, sepsis bundle), order status tracking, results inbox with critical value alerts.
- Daily auto charges (bed, nursing, monitoring) generated from encounter state.
- Discharge summary auto drafted from chart.
- Tablet friendly UI at bedside.
