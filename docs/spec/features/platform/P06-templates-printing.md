# P06 Templates and Print Configuration

## Purpose
Hospitals print a lot: invoices, prescriptions, lab and radiology reports, discharge summaries, POs, certificates. Each tenant wants its own letterhead, field visibility and wording. Templates also speed up repeated text (PO terms, discharge instructions).

## Users
Tenant admin, department heads (radiology, OPD), procurement.

## Screens in current app
| Menu | Route | Purpose |
|---|---|---|
| Settings > General Templates / Inventory > Inventory Templates | /configuration/templates-v2 | Rich text templates by type |
| Settings > Report Header Controls | /configuration/header-controls | Which header fields show on report prints |
| Settings or System Admin > Patient Invoice Web/PDF Control | /system-settings/system-controls-v2 | Invoice, prescription and slip print toggles and service type rules |
| Out-patient > Prescription Controls | /system-settings/prescription-controls-v2 | Prescription layout per template |
| Out-patient > Template for OPD Prescription | /pdf-reports/prescription | Preview of prescription slip |
| RIS > Report Template | /radiology/pdf-report | Preview of radiology report, Print, Download .docx |

## Data captured

### General template
| Field | api_name | Req | Notes |
|---|---|---|---|
| Type | config_type | yes | 27 types: Patient Discharge Report, PO General Instructions, PO Terms and Conditions, PO Delivery Remarks, PO Remarks, Warranty, Blood Bank Template... |
| Code, Name | code, name | yes | |
| Active | is_active | | |
| Heading | | | |
| Body | rich text (Summernote: bold, lists, tables, links, pictures, video, code) | | |
| List | Code, Template Name, Status; search by type and text | | |

### Report header controls
Template selector (Organization Default, plus custom), about 70 header fields (MRN, Father/Husband, Reg Date, Contact, Department, CNIC, Consultant, Address, Created at, Performed at, Reported at, Patient Type, Accession #...), each: Is Show, Alignment (Left/Right), Heading text, Sort Order. Header and footer images per branch.

### Patient Invoice Web/PDF Control (System Service Controls)
Sections: Patient Services Page Controls; Services Control For Doctor; Expired user all sessions at logout. Flags include: patient_services_is_prescription, patient_services_is_invoice, allow_zero_service_price, radiology_services_invoice, is_radiology_invoice_header, is_radiology_invoice_footer, print_unpaid_invoice_radiology, patient_type_user_allocation, enable_age_value, enable_cnic_mandatory, is_requested_service, is_birth_certificate_header, admission_form_web, admission_slip, admission_sms, lab_report_verification_sms, radiology_report_verification_sms. Table per service type: Ref Doctor Mandatory, Prof (performing) Doctor Mandatory.

### Prescription controls
Template (Organization Default, EMR Nursing Template, EMR MO Template, specialty templates), show header (height px), show footer (height px), and 55 sections each with: Show On UI, Show On Print, Type (Dynamic/Static), Alignment On UI, Alignment On Print, Height, Heading, Sort Order On UI, Sort Order On Print.

## API endpoints observed
`/api/prescription_configurators/`, `/api/prescription_control_templates`, `/api/service_type_configurator/`, `/api/v4/templates`, `/api/search_report_templates/`.

## Issues in current app
- Behavioural business rules (CNIC mandatory, SMS on admission, zero price allowed, session expiry) are mixed into a "print control" screen.
- Grid editors with hundreds of inputs; no live preview while editing.

## Rebuild notes and extensions
- Separate **business settings** (validation, SMS) from **document layouts**.
- Document designer: HTML/Handlebars templates with variables, versioned, preview with sample data, per branch letterhead, QR code (invoice verification, report authenticity).
- Output: PDF, thermal receipt (80mm), A5 slips, labels (wristband, sample barcode, medicine tag).
- Text snippets/macros with variables (`{{patient.name}}`), usable in clinical notes and reports.
- Digital signatures and stamps on reports.
- Delivery: print, email, SMS link, WhatsApp, patient portal.

## Open questions
- Which of the 55 prescription sections are actually printed by most doctors?
