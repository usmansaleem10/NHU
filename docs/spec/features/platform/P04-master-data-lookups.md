# P04 Master Data and Lookups

## Purpose
Shared reference data used across modules: departments, locations, generic lookups, configuration types, document types, staff types. Keeps dropdowns consistent and reports groupable.

## Users
Tenant admin, module admins.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Settings > Department Management | /department/management-v2 | Tabs Departments, Sub Departments. Columns ID, Department/Floor, Package, Action; Sub Department/Code, Type. 86 rows |
| Settings > Configuration Lookup V2 | /configuration/lookup-v2 | Category, Name, Key, Status; Add Configuration. 23 rows |
| Settings > Configuration Types | /configuration/config-types-v2 | ID, Name, Type, Status; 233 rows |
| Settings > Add location | /configuration/countries | Tabs Countries, States, City, Location |
| Settings > Document Type | /configuration/document-type-v2 | Code, Name, Status (documents attached to admission etc.) |
| Settings > Add staff type / System Admin > Staff Type | /configuration/staff-type, /configuration/staff-type-listing | Code, Name, Status, Description |
| Settings > Intake / Outtake | /configuration/intake-output-config | See C09 |
| Settings > Diagnosis V2 | /configuration/diagnosis-v2 | See C10 |

## Data captured
| Entity | Fields | Reason |
|---|---|---|
| Department | name, floor, package, code, type, parent | Organisational unit for billing, staffing and clinical lists. "Package" suggests department level package pricing |
| Lookup | category, name, key, status | Small enumerations (relation, religion, title, marital status) |
| Configurator type | name, type, status | Larger enumerations: designations (145), employee categories, staff types, groups, divisions, demand types, OT OR types, intake/output methods |
| Country/State/City/Location | name, status | Addresses and branch setup; Pakistan cities preloaded |
| Document type | code, name, status | Classify scanned documents (CNIC copy, consent, referral) |
| Staff type | code, name, status, description | PCD Staff, Doctor, OT Staff, Admin Staff, Radiology Staff... |

Department examples: Accounts and Finance, Administration, Anesthesia, Aesthetic, Bio Medical, Blood Bank, Billing, Gynaecology, Peads, ENT, Neurology, Orthopaedic, Lab, Radiology sub units per doctor (Ultrasound_Dr_X).

## API endpoints observed
`/api/departments`, `/api/v4/departments`, `/api/v4/departments/fetch_sub_department`, `/api/fetch_opd_departments`, `/api/get_ipd_departments/`, `/api/lookups`, `/api/lookups_listing/`, `/api/configurator_types`, `/api/v4/configurator_types`, `/api/document_types`, `/api/list_countries`, `/api/list_states`, `/api/list_cities`, `/api/list_locations`.

## Issues in current app
- Departments mix clinical services, admin functions and doctor specific subunits ("Ultrasound_Dr_Ayesha"), which pollutes every department dropdown (77 options).
- One generic configurator table for unrelated enums.

## Rebuild notes and extensions
- Department with type (clinical, diagnostic, support, administrative), cost center code, and flags (accepts admissions, OPD clinic, has store). Doctor specific rooms become "service points" or resources, not departments.
- Typed reference data service (see cross-cutting concepts) with import/export and vendor seeded defaults.
- Standard code sets: ICD-10 (diagnosis), LOINC (lab), CPT/local codes (procedures), ATC (drugs), ISO country codes.
- Effective dating (valid from/to) so historical reports keep old names.

## Open questions
- What does "Package" on department represent (bed package, surgical package)?
