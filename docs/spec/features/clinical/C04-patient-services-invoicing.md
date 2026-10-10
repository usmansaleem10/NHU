# C04 Patient Services and Invoicing

## Purpose
The cash counter. Bill a patient for consultations and services (lab, radiology, procedures), issue an OPD token, collect payment or put it on receivable/panel credit. This is where most daily revenue enters.

## Users
Front desk cashier, reception.

## Screens in current app
| Menu | Route | Notes |
|---|---|---|
| Front Desk > Patient Services (hidden, opened from Registration "Invoicing") | /patient/services-new | Tabs Services, Consultation, Other Services, Payment Info; side Patient List |

## Workflow
1. Select patient (search by MRN, Name, Phone, CNIC, SAP ID, THUMB).
2. **Consultation**: pick doctor, department, sub department, visit type, clinic name/number, price (from C03), token (Next Available), Tele Medicine flag.
3. **Services**: search and add services by name/code; or pull **Requested Services** (orders placed by doctors in OPD/IPD/ER, listed with Date, Service, Department, Requested By/From, Price).
4. **Other Services**: donation types and amounts.
5. **Payment Info**: Payment Type (Paid/Un-Paid), Payment Mode (Cash, Cheque, Credit Card, Bank Transfer), Cash amount, Receivable, Ledger (receivable account e.g. a department ledger), Reference/Source, due payment shown.
6. Submit, print invoice and token slip; prescription slip optionally printed (P06 flags).

## Data captured
| Field | api_name / control | Reason |
|---|---|---|
| Doctor | conDoctor | Consultation provider, doctor share |
| Department, Sub Department | conDept, sub dept | Revenue and queue |
| Visit Type | conService | First visit, follow up etc. sets fee |
| Clinic Number, Clinic Name | | Room routing |
| Price | number | From price list, may be editable |
| Token No | conToken (Next Available) | OPD queue number (C06) |
| Tele Medicine | checkbox | Remote consult |
| Services | searchProductValue, department filter | Items to bill |
| Requested Services | checkbox | Bill doctor orders |
| Payment Type | Paid / Un-Paid | Unpaid creates receivable |
| Payment Mode | Cash, Cheque, Credit Card, Bank Transfer | GL mapping (F04) |
| Cash, Receivable | amounts | Split payment |
| Ledger | e.g. "NEPHROLOGY" | Receivable ledger |
| Reference/Source | select | Marketing source or referral |

Mandatory referring and performing doctor per service type are enforced by settings (P06).

## API endpoints observed
`/api/get_patients_by_type_adjustments/`, `/api/service_type_configurator/`, `/api/get_opd_doctors`, `/api/fetch_opd_departments/`, `/api/fetch_sub_department/`, `/api/get_referring_doctors/branch_wise_visiting_employees/`, `/api/patient_service_invoice_for_requests/:id/`, `/api/patient_advances/`, `/api/system_billing_control/`, `/api/user_front_desk_control/`, `/api/send_token_numbers/`.

## Rebuild notes and extensions
- Split **ordering** (clinical) from **charging** (financial): orders auto create charges; cashier only collects.
- Cart style counter: patient, items, payer split (panel portion vs patient co-pay), discounts with reason (C05), multiple payment modes in one receipt, change calculation.
- Card terminal and QR/wallet payment integration (JazzCash, Easypaisa, Raast), payment links via SMS.
- FBR invoice number and QR on receipt.
- Deposits and pay later with credit limit per patient/payer.
- Receipt reprint with "duplicate" watermark, void within shift only.
- Keyboard first UI for speed.

## Open questions
- Whether price can be overridden at the counter and how it is controlled.
