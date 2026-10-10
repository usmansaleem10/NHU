# Cross-cutting Concepts

Patterns that repeat across modules. The rebuild should implement each once as a platform service.

## 1. Lookups and configurator types

Most dropdowns are fed by generic configuration tables rather than dedicated tables:

| Mechanism | API | Screen | Examples |
|---|---|---|---|
| Lookups (category, name, key, status) | `/api/lookups`, `/api/lookups_listing/` | Settings > Configuration Lookup V2 | Relations, religions, titles |
| Configurator types (ID, name, type, status), 233 rows | `/api/configurator_types`, `/api/configurator_type` | Settings > Configuration Types | Designations, employee categories, staff types, groups, divisions, OT OR types, demand types |
| Medicine configurators | `/api/medicine_configurators` | Dose and Frequency Configuration | Dose type, dose, frequency, route, instruction |
| Radiology, lab, prescription configurators | `/api/radiology_configurators/`, `/api/lab_configuration_by_types`, `/api/prescription_configurators/` | Module config screens | Specimen, UOM, body regions |
| Service type configurator | `/api/service_type_configurator/` | Patient Invoice Web/PDF Control | Per service type: referring doctor mandatory, performing doctor mandatory |

Rebuild: one typed "reference data" service with categories, per-tenant values, ordering, active flag, optional code and color, and i18n labels. Keep dedicated tables only where the entity has behaviour (Department, Ward, Store, Service).

## 2. Approval workflows

Used by Internal Requisition, Purchase Request, Purchase Order, Work Order, Leave, Loan, patient discount and cancellation requests, doctor share.

- **Policy Type**: per department and document type (IR, PR, PO, Work Order).
- **Reporting Flow Policy**: ordered levels; each level has a type (Department or Generic), employee roles allowed to act, a narration (Received By, Store Incharge, Issuing Authority, Department Incharge, Approved By) printed as the signature caption, and "Can Edit?" (approver may change quantities).
- HR flavour: internal levels (Section Head, Dotted Manager, Direct Manager) and external levels (by employee role); "is paid" flag for leave.
- Employee Role carries PO amount limits, used for amount-based routing.
- Listings show tabs Pending, Pending Review, Approved, Rejected and split Routine vs Special Approval.

Rebuild: a generic approval engine (P05) with document type, condition (department, amount, priority), ordered steps, approver resolution (role, manager chain, specific user), edit rights, delegation, SLA reminders and full audit trail.

## 3. Chart of accounts linkage on masters

A repeating "Chart of Account" block (Book of Account > Account Group > Subsidiary Account) appears on: Store Type, Store, Vendor, Manufacturer, Tax Type, Allowance/Deduction, Leave Type, Loan Type, Bank Management, Taxation. This is how operational events post to the GL. Rebuild: posting rules table (F04) keyed by event and dimension, instead of COA fields on every master.

## 4. Templates

- General Templates (rich text, typed: Patient Discharge Report, PO General Instructions, PO Terms and Conditions, PO Delivery Remarks, PO Remarks, Warranty, Blood Bank, 27 types).
- Radiology report templates per doctor.
- OPD prescription templates (complaints, medicines, diagnosis, investigations, follow up).
- Inventory "Save Template" on IR and GRN to reuse item lists.
- Checklist templates (Surgical Safety Checklist, consent forms, nutritional screening).

Rebuild: one template service with type, owner (tenant, department, user), variables and versioning.

## 5. Print and report header controls

- Report Header Controls: per template, about 70 header fields each with show flag, left/right alignment, heading text and order.
- Prescription Controls: 55 prescription sections each with show on UI, show on print, dynamic/static, alignment on UI and print, height, heading, order.
- Patient Invoice Web/PDF Control: flags for invoice/prescription printing per service type, radiology header/footer, unpaid invoice print, admission slip, SMS toggles.
- Branch level header and footer images (general and radiology).

Rebuild: a document rendering service (HTML to PDF) with per-tenant layout templates; layout editing as a designer instead of 70 row forms.

## 6. Patient search widget

Appears on most patient screens: search type (Default, MRN, Name, Phone, CNIC, SAP/Emp ID, Admission ID, THUMB) plus query, with a side "Patient List". Rebuild as one shared component and one search API with fuzzy matching.

## 7. Standard list screen

Search fields, Search button, Add New, Export, page size (25), Action column. Standard add screen: Code, Name, Description, Status (Active/Inactive), Back, Add. About 60 screens are plain CRUD of this shape, which a rebuild can generate from metadata.

## 8. Dates and filters

Almost every report uses From Date, To Date, Department, Sub Department, Doctor, Patient Type, User. Rebuild: shared filter bar and saved filter presets.

## 9. Department and sub department

Two-level department tree drives billing (service belongs to sub department), clinical worklists, inventory requests, payroll grouping, and reports. Departments double as floors and packages.

## 10. Patient category

OPD, IPD, EMR (emergency), sometimes OT and Dialysis. Used as a filter almost everywhere. Model as `encounter.type`.

## 11. Payment modes

Cash, Cheque, Credit Card, Bank Transfer, Credit. Payment type Paid / Un-paid. Each mode maps to a COA account (F04).

## 12. Versioned screens

v1, v2, v3 of the same screen coexist in menus (registration, pricing, dashboards, roles). The rebuild should have one version and feature flags.
