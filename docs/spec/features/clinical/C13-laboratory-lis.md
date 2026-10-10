# C13 Laboratory (LIS)

## Purpose
Manage lab orders from billing to delivered report: sample collection, receipt in lab, result entry, verification by pathologist, printing and SMS. Configuration defines tests, parameters, reference ranges, specimens and culture reporting.

## Users
Lab front desk (phlebotomy), lab technologists, pathologist/lab manager.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| LIS > LAB Test Processing | /lab/lab-processing | Worklist |
| LIS > Lab Test | /lab/test-v2 | Test catalog with parameters |
| LIS > Lab Parameter (v2) | /lab/parameters-v2 | Parameter catalog |
| LIS > Lab Configuration v2 | /lab/configuration-v2 | Tabs Specimen, Unit Of Measure, Body Regions, Heading, Sample Taken From, Lab Machine, Antibody Results Configurator, Send Out |
| LIS > Lab Culture Configuration | /lab/culture-configuration | Culture plates, culture, final report, sensitivity (antibiotics), free fields, report comments, microscopy |
| Add Lab Test, Add Parameter, Lab Configuration, Lab Parameter (v1) | dead routes | |
| Analytics > Dashboard Lab | /dashboard/lab | Top tests and sections |

## Worklist (lab processing)
Filters: date range, sub department (molecular lab, special chemistry, blood bank, routine chemistry, histopathology, hematology...), status (Pending, Sampled, Received, Reported, Verified, Delivered), search by MRN, patient name, Lab ID, test name. Tabs All, OPD, IPD, Urgent, Returned, Canceled. Columns: Date/Lab Id, Test Name/Department, Patient/MRN, Patient Category/Type, Specimen/From, Status, Collect, Action. Actions: Collect, Clear, Preview, Print, Requisitions List, Print Logs.

## Status flow
Pending (ordered and paid) > Sampled (collected, barcode) > Received (in lab) > Reported (results entered) > Verified (pathologist) > Delivered. Returned and Canceled branches. SMS on verification (P06 flag).

## Test configuration fields
| Field | Notes |
|---|---|
| Name / Code | Billing code links to C03 |
| Department | Lab section |
| Color | Tube colour |
| Report Time | Turnaround time |
| Descriptions | Interpretive text |
| Report Type | Culture, PCR, Customized, Solana (special formats) |
| Show Previous Result | Delta comparison on report |
| Status, Test Format, Order | |
| Parameters | Code, Title, UOM, Parameter type, Heading, Show next to |
| Send Out | Outsourced lab |

Parameter fields: Code, Title, UOM, Reference Value/Comments, Result Format, Status.

## API endpoints observed
`/api/all_lab_orders/`, `/api/lab_configurations`, `/api/lab_configuration_by_types`, `/api/lab_controls`, `/api/culture_configurations`, `/api/v4/culture_configurations`, `/api/culture_configurations/filter_culture_type`, `/api/pcr_configurator/`, `/api/sms_configuration/`, `/api/get_lab_tests_in_medical_unit`, `/api/get_lab_assessments_in_medical_unit/`, `/api/sub_department/sub_dept_drop_down/`, `/api/send_outs/`.

## Rebuild notes and extensions
- Reference ranges by age, gender, pregnancy with critical limits and auto flagging (H/L/critical), delta checks.
- Barcode labels at collection, sample tracking, rejection reasons.
- Analyzer interfacing (ASTM/HL7) with auto result import and middleware.
- Calculated parameters (e.g. LDL, eGFR), reflex tests.
- QC module (Levey Jennings), reagent inventory consumption per test.
- Panels/profiles, outsourcing (send out) with tracking and cost.
- Patient report portal, QR verification on PDF, cumulative reports.
- LOINC mapping; TAT dashboard.
