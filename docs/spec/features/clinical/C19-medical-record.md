# C19 Patient Medical Record

## Purpose
Show a patient's past encounters and clinical data in one place so clinicians have context and records staff can answer requests.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| System Administration > Patient Previous Medical Record | /patient-history/v2 | Visit type filter (OPD, IPD, Emergency, All), visit selector, patient search (MRN, Name, Phone, CNIC, SAP ID, Admission ID). Vitals table: Weight, Height, BMI, BP systolic/diastolic, Pulse, Resp Rate, Temperature, SPO2, BSR |

Also: Patient Hist., Adm Hist, Rad Hist, Lab Hist buttons in OPD/ER/IPD; Previous History Alert in OPD.

## Rebuild notes and extensions
- Patient summary header everywhere (allergies, alerts, active problems, current meds, payer).
- Timeline of encounters, documents, results, prescriptions, with filters.
- Document management: scanned records, consent forms, external reports with tagging.
- Release of information workflow (requests, approvals, redaction, log).
- Access audit on every chart open; restricted records.
- Patient portal exposing selected records; FHIR export.
