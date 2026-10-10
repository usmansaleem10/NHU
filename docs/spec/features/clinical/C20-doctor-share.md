# C20 Doctor Share

## Purpose
Most consultants in Pakistani private hospitals are paid a share of the revenue they generate (consultations, procedures, surgeries, referrals) rather than a salary. The system calculates each doctor's share per service, gets it approved and pays it, posting to finance.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Settings > Doctor Share (calculation) | /doctor/share-v2 | Doctor list (86) searchable by ID/name; per doctor share setup |
| Billing > Share V3 | /doctor/share-v3 | Share Policy (named per doctor or hospital policy), Services/Visits, Department, Sub Department; Assign To Doctor |
| Finance > Assign Services to Doctor | /finance/configuration/assign-doctor-services | Doctor, department, sub department, services, type (All, Visits) |
| Billing > Share Approval | /doctor/share-approval-report | Filters dates, doctor, shift, doctor type (Performing/Referring), patient type, paid status, pay share type (Doctor-wise/Department-wise), department, services, visit type (OPD/IPD); Action: Approved Share / Pay Share |
| Billing > Doctor Share Report | /reports/share-wise-report | Filters dates, doctor, doctor type, patient type, paid status, department, sub dept, service |

Day Book report shows per line: Total Sale, Discount, Manual Discount, Net Amount, Doctor Share Amount, Hospital Share Amount.

## Concepts
- **Share policy**: named rule set (hospital default or doctor specific) with % or fixed amount per service or visit, per department.
- **Doctor type**: performing doctor vs referring doctor (referral commission).
- **Shift** matters (evening/night shift shares differ).
- Discount handling: whether discount reduces doctor share.
- Workflow: calculated > approved > paid (cash, cheque, bank transfer vouchers via F04 payment mode COA for share).

## Rebuild notes and extensions
- Share rule engine with priority: doctor + service > doctor + department > policy default; effective dates; caps and minimum guarantees; tiered % by monthly volume.
- Split shares (surgeon, assistant, anaesthetist) for OT packages.
- Panel claims: share released only when payer pays (cash basis option).
- Monthly statement per doctor with drill-down, self service doctor portal.
- Withholding tax on doctor payments.
- Payout batch with bank file export.
