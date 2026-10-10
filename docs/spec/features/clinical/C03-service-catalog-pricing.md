# C03 Service Catalog and Pricing

## Purpose
Define everything the hospital charges for and at what price per patient type and setting (OPD vs IPD). Accurate catalog equals correct revenue, doctor shares and finance postings.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Settings > Misc Services V2 | /misc-services/v2 | List: Name/Billing Code, Department, Sub Department, Comments, Status. Search by billing code, name |
| Settings > Add Misc. Service V2 | /misc-services/add-v2 | Create service |
| Billing > Price List Management (Pricing v3) | /pricing/v3 | Price matrix |
| System Admin > Pricing V2 | /pricing/v2 | Older price matrix with Copy Price |
| Settings / Front Desk > Doctor visit fee | /doctor/visit-configuration | Consultation fee matrix |
| RIS > Radiology Services | /radiology/services-v2 | See C14 |
| OT > Ot Services | /ot/services-v2 | See C15 |
| LIS > Lab Test | /lab/test-v2 | See C13 |

## Data captured

### Misc service
| Field | api_name | Req | Reason |
|---|---|---|---|
| Code / FBR ID | code | yes | Billing code and FBR (tax authority) item code |
| Department | parent_department_id | yes | Revenue grouping |
| Sub Department | department_id | yes | Performing unit, doctor share rules |
| Name | service_name | yes | |
| Comments | comments | | |
| Type | misc_ser_type: Nursing Procedure, Cardiac Procedure | | Category |
| Price | service_price | yes | Base price |
| Replicate Service price On | replicate_service_pat_types (multi) | yes | Copy price to other patient types |
| Apply same price on selected types | checkbox | | |
| Status | is_active | | |

Service types in system: Radiology, LabInvestigation, MiscService, DoctorFee, Donation, Product, DialysisService, OtService, Advance.

### Price list (v3)
Filters: patient type, service type (Services/Visits), department, sub department, code, name, OPD/IPD/Both, percentage. Columns: Name/Code, OPD Price, IPD Price, Both OPD IPD, S/D OPD, S/D IPD (special/discounted price), Actions. Actions: Update Pricing List (bulk by %), Copy Pricing List (from one patient type to another), Add Service, Download Price List.

### Doctor visit fee
Columns: Service Code, Service Name, Visit Fee, Visit Type, Unit Type, Doctor Category, Shift, Status. Each row links a procedure/service. Purpose: consultation fee varies by doctor category, visit type (first, follow up), unit and shift (evening clinics).

## API endpoints observed
`/api/misc_services`, `/api/service_search`, `/api/services_by_type`, `/api/services_by_type/dept_wise_services/`, `/api/v4/services`, `/api/v4/services/all_services`, `/api/v4/services/service_types`, `/api/v4/services/services_without_product`, `/api/fetch_sub_dept_service_wise/`, `/api/lookup_medical_unit_wise/`.

## Rebuild notes and extensions
- One **Charge Master**: every billable item (service, procedure, test, imaging, bed day, consultation, consumable, package) with code, type, department, revenue account, tax rule, FBR code, CPT/local code mapping.
- **Price lists** as separate versioned objects: per payer/plan, per setting (OPD/IPD/ER), per bed class (general ward vs private room), effective dates, rounding rules. Bulk % update with preview and approval.
- **Packages**: surgical/maternity packages with included items and overflow rules.
- Doctor fee rules: by doctor, visit type, time band, tele vs in person.
- Charge capture rules: auto charges (bed day at midnight, nursing charges, admission fee).
- Price change audit and approval.

## Open questions
- Meaning of S/D columns (special discount vs senior discount).
- Unit Type in doctor visit fee.
