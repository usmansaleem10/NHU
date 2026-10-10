# System Overview

## What the product is

A full hospital information and management system (HIMS) for a mid-size private hospital group in Pakistan. It covers patient administration, clinical documentation (OPD, ER, IPD, OT), diagnostics (lab, radiology), pharmacy and supply chain, HR, payroll, finance, and analytics. The observed tenant is a two-branch hospital (main hospital plus a medical and cancer center) with about 77 departments, about 340 employees, 11 wards and 6 operating rooms.

## Technical shape (observed)

| Aspect | Observation |
|---|---|
| Frontend | Angular 15 single page app with jQuery and Bootstrap (Metronic "ki" icon theme), Summernote and TinyMCE rich text editors, bootstrap-select dropdowns |
| Hosting | Frontend on one host (`ncih.chealth.pk`), API on another (`bep.chealth.pk`) |
| API style | REST under `/api/...`, with a newer `/api/v4/...` generation living side by side. Auth by `auth_token` query parameter plus `medical_unit_id` on calls |
| Naming | Rails-style snake_case resources (`/api/patient_types`, `/api/lookups`, `/api/role_screen_controls`), strongly suggesting a Ruby on Rails backend |
| Session state | The whole user object, role, menus and screens are cached in browser `localStorage` (`currentUser` about 89 KB, `currentScreen`, `auth_token`, `firebase_token`) |
| Push | Firebase token stored, so push notifications are via Firebase Cloud Messaging |
| Activity log | Every navigation posts to `/api/session_log/` |
| Versioning | Screens versioned in the URL and menu name (`registration-v2`, `-v3`, `pricing/v2`, `/v3`), old versions left in menus |
| Localisation | Header language switch (English, Spanish); date, time, currency and timezone formats per tenant |

## Tenancy and structure

```
Platform (vendor, many tenants: "medical units", e.g. clinics, dispensaries, hospitals)
└── Medical Unit (tenant) ............ org settings, logo, formats, currency, entity type (Patient / Customer / Visitor)
    ├── Branch (clinic) .............. e.g. main hospital, cancer center; own header/footer images
    │   └── Location ................. physical site (city level, e.g. Sargodha, Bhera)
    ├── Department > Sub department .. clinical and admin departments, floor, package
    ├── Ward > Bed / Room
    ├── Store (inventory location) ... with type, category, parent store
    ├── Book of Account .............. separate ledgers inside one tenant
    └── Roles, Users, Employees
```

A "Clone Data" screen copies medicine, lab or checklist masters from one medical unit to another, which confirms a multi-tenant SaaS used by many small facilities.

## Module map (22 menu modules)

| Menu module | Main features | Screens |
|---|---|---|
| Settings | Global configuration grab bag (roles, lookups, org, templates, departments, shifts) | 46 |
| Complaint Management | Internal complaints | 1 |
| Inventory | IR, PR, PO, GRN, issue notes, warehouse transfer, masters, reports | 72 |
| Payroll | Payroll processing, allowances, reports | 15 |
| HR | Employees, leave, roster, attendance, loans, certificates | 39 |
| Blood Bank | Requisition, receiving, stock | 4 |
| Pharmacy | POS, stock and pharmacy reports, medicine requests | 8 |
| Analytics | Dashboards | 11 |
| RIS | Radiology workflow and services | 6 |
| Billing Management | Final settlement, sale received, 25 reports, pricing | 28 |
| Front Desk | Registration, admission, services, adjustments, sale close | 13 |
| In-patient | IPD worklist, ER v2, ward management | 3 |
| Out-patient | e-Prescription, history, prescription configuration | 6 |
| LIS | Lab processing and configuration | 9 |
| Emergency | ER worklist | 1 |
| Dialysis | Patient dialysis (route broken) | 1 |
| Finance | GL setup, vouchers, payables, reports | 36 |
| OT | Requests, approval, surgery, ORs | 7 |
| Donation | Donations and report | 2 |
| System Administration | Users, permissions, branches, cloning, pricing, stock adjustment | 16 |
| PM Tool | Tasks and projects | 6 |
| Claim Management | Claims | 1 |

Total 325 menu entries, 298 unique routes. Menus are per role, so other roles may see screens not listed here.

## External integrations visible

| Integration | Evidence |
|---|---|
| FBR (Pakistan tax authority) POS integration | "Code / FBR ID" on services, "FBR Invoice #" filter, "FBR Tax Applied On" in tax types |
| Biometric attendance devices | "Sync Employee", "Sync Attendance", "Refresh Attendance" |
| Thumbprint scanner and webcam | "Scan Thumb", "Get Picture" on registration; THUMB patient search |
| SMS and email | SMS on admission, lab and radiology verification; System_Admin "SMS/Email" tab |
| Firebase | Push notifications |
| Insurance panels (e.g. EFU Life) | Patient type, company, group, claim management |
| Lab machines | "Lab Machine" configuration tab |
| Tele-medicine | Tele-Medicine section and checkbox in OPD and services |
| Word export | Radiology report "Download .docx" |
