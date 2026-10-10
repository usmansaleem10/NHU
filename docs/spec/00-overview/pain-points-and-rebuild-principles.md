# Pain Points and Rebuild Principles

## Pain points observed in the current app

### Navigation and information architecture
1. Menus are configured per role by hand, so the same screen appears under several modules with different names (Task List in three places, Shift Location in three).
2. Labels do not match what opens ("Create PR Request" opens the PR listing, "PR Approval" under PO opens PO approval).
3. Dead links: 8 menu entries silently bounce to the dashboard.
4. Version sprawl: v1, v2, v3 screens side by side (registration, pricing, roles, dashboards, medicine request, create user).
5. "Settings" is a 46 item grab bag mixing HR, billing, clinical and system configuration.
6. Typos throughout (Wharehouse, Attendandace, Writting, Listig, Configuratuion, Controles, Taxcation, Labortory, Paitent), signalling no content review.

### Data model
7. Generic configurator tables hold unrelated concepts (233 rows) making validation and reporting weak.
8. COA fields repeated on a dozen masters instead of posting rules.
9. Role codes free text and duplicated. One role per user forces combination roles.
10. Department table doubles as floor, package and admin unit.
11. Product prices live on the product and on GRN lines and on price lists; unclear source of truth.

### UX
12. Very long single page forms (OPD and ER forms render about 300 inputs, mostly checkboxes for review of systems).
13. Configuration as giant grids (70 header rows, 55 prescription rows x 10 columns, 320 COA rows editable inline).
14. Large dropdowns of 300 to 400 people or services loaded in full in the browser instead of typeahead search.
15. Most reports are filter forms that render nothing until "Search"; no saved views, little drill-down.
16. Inconsistent placeholders (search box labelled "Name: Employee Name" on unrelated screens like UOM and Tax Type), copy pasted forms.

### Technical
17. Auth token passed in query strings; whole user object (89 KB) in localStorage.
18. Two API generations mixed on the same screens (`/api/` and `/api/v4/`).
19. Screens fire 10 to 20 API calls on load, including unrelated ones.
20. No visible audit trail per record, no record history UI (an "Audit Logs" header button exists).

## Rebuild principles

1. **Domain driven modules** with clear ownership: Patient Admin, Clinical, Diagnostics, Pharmacy and Supply Chain, Revenue Cycle, HR, Finance, Platform.
2. **One encounter model**: OPD visit, ER visit, admission, day care, dialysis session, OT case are encounter types sharing orders, notes, vitals, diagnoses, billing.
3. **Orders as a first class concept** (lab, radiology, procedure, medication, service). Billing is generated from orders and charge rules, not typed twice.
4. **Event driven finance**: every billable or stock event publishes an event; posting rules turn events into journal entries. No COA fields on operational masters.
5. **Generic approval engine** and **generic template/print engine** (see cross-cutting concepts).
6. **Permission model** with resource, action and scope; multi-role users; navigation derived from permissions.
7. **Configurable clinical forms** built from a form schema (sections, fields, conditional logic), so OPD, ER, specialty forms and checklists are data, not code. Keep structured data (ICD-10 codes, SNOMED-ready).
8. **Search first UX**: global patient search and command palette, typeahead everywhere, saved filters, keyboard friendly front desk and POS.
9. **Reports on a reporting store** (read replica or warehouse) with a report builder and export, instead of 50 hand coded report screens.
10. **Interoperability ready**: HL7 FHIR resources for Patient, Encounter, Observation, DiagnosticReport, MedicationRequest; HL7v2 or ASTM for lab machines; DICOM worklist for radiology modalities.
11. **Multi-tenant and multi-branch from day one**, with tenant level feature flags.
12. **Audit everything**: who changed what and when, visible on each record.
13. **Mobile friendly** worklists for doctors and nurses.
14. **Localisation**: Urdu and English, PKR formatting, FBR integration, CNIC validation.
