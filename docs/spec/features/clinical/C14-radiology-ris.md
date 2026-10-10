# C14 Radiology (RIS)

## Purpose
Manage imaging orders: technician acknowledges and performs the exam, radiologist writes and signs the report from templates, addendums after signing, report delivery.

## Users
Radiographers/technicians, radiologists, radiology front desk.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| RIS > Tech.Acknowledgement | /radiology/acknowledgement-v2 | Worklist for technicians |
| RIS > Report Writing | /radiology/radiology-writing-v2 | Radiologist editor |
| RIS > Report Addendum | /radiology/report-addendum-v2 | Add addendum to finalised report |
| RIS > Report Template | /radiology/pdf-report | Print layout preview, Download .docx |
| RIS > Radiology Templates v2 | /radiology/templates-v2 | Report templates per doctor |
| RIS > Radiology Services | /radiology/services-v2 | Service catalog |
| Analytics > Dashboard Radiology | /dashboard/radiology | |

## Workflow and data
1. **Acknowledgement**: filters dates, patient (MRN), accession no, CNIC, department (Mammography, Ultrasound per doctor, X Ray...), status (Pending, Acknowledged, Final Signed, Delivered, Cancel), priority (Routine, Same Day, Emergency); tabs All, OPD, IPD, Urgent, Returned. Technician enters "Indication for Exam" and clicks Acknowledge.
2. **Report writing**: list (Date/Acc Number, Name/MRN, Service/Department, Performing Dr, Referring Dr) filtered Self/Others/All, department, patient search. TinyMCE editor; load template by name; Save as template, Save Report, Save and Print, Final Sign. Previous Reports panel.
3. **Addendum**: search finalised by MRN, CNIC, dates; History text; editor.
4. Delivery: print or SMS (radiology_report_verification_sms).

Template: name, doctors (owner), body. Service: name, body region, contrast, status, prices per patient type.

## API endpoints observed
`/api/tech_acknowledgement/`, `/api/search_radiology_writing/`, `/api/search_finalized_investigation/`, `/api/search_report_templates/`, `/api/radiology_configurators/`, `/api/public_radiology_configurator/`, `/api/radiology_user_wise_sub_departments/`, `/api/get_referring_doctors`, `/api/radiologies`.

## Rebuild notes and extensions
- DICOM Modality Worklist to push orders to machines; PACS integration with image viewer link in report.
- Structured reporting (BI-RADS, TI-RADS, LI-RADS) and macros.
- Peer review, critical findings communication with acknowledgment log.
- Scheduling for modalities (MRI, CT slots), preparation instructions to patients.
- Contrast and radiation dose recording.
- Turnaround dashboards, radiologist productivity (RVUs).
- Report sharing link to referring doctor and patient portal.
