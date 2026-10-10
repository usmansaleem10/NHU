# P03 Organization, Branches and Tenancy

## Purpose
Define the hospital (tenant) and its branches: identity on prints, formats, currency, time zone, logos, and branch specific headers. Multi branch groups need consolidated and per branch operations.

## Users
Tenant admin, vendor super admin.

## Screens in current app
| Menu | Route |
|---|---|
| Settings > Organization Setting v2 | /system-settings/organization-settings-v2 |
| Settings > Organization Setting v1 | /system-settings/organization-settings (dead) |
| System Administration > Branch V2 | /configuration/branch-v2 |
| System Administration > Add Branch | /configuration/add-branch |
| System Administration > System_Admin | /system-admin (tabs General, SMS/Email, Quick Links; default Country, State, City, Location) |
| System Administration > Clone Data | /system-settings/clone-data |
| Header > Change Branch | global |

## Data captured

### Organization settings
| Field | api_name | Type | Req | Reason |
|---|---|---|---|---|
| Name | title | text | yes | Legal name on prints |
| Address | address | text | yes | Prints |
| Phone | phone_number | text | yes | Prints |
| Email | email | text | yes | Prints, notifications |
| Website Address | website_url | text | yes | Prints |
| Fax | fax | text | yes | Legacy prints |
| Organization name for login page | organization_name_for_login_page | text | no | Branded login |
| Date format | date_format | select (15-12-2024, 12-15-2024, 15/12/2024, 2024-12-15...) | no | Localisation |
| Time format | time_format | select (3:52, 3:52 pm, 15:52, 15:52:18) | no | Localisation |
| Date and Time format | date_time_format | select | no | Localisation |
| Currency | currency_type | select (PKR, USD) | no | Money display |
| Currency Format | currency_format | text | no | Decimal and grouping |
| Time Zone | time_zone | select (109 zones) | yes | Timestamps |
| Entity Type | entity_type | select Patient/Customer/Visitor | yes | Relabels "patient" for non hospital tenants (pharmacies, labs) |
| Images | logo, login page image, home image, top image, employee card image | file | no | Branding, ID cards |

### Branch
| Field | api_name | Req | Reason |
|---|---|---|---|
| Code, Name, Short Name | code, name, short_name | code, name | Identify branch on invoices and reports |
| Start Date | start_date | | Reporting |
| Branch Head | branch_head | yes | Accountability |
| Contact No, Email, Phone, Fax, Address | contact, email, phone_number, fax, address | contact, email | Prints |
| Project Accountant, Accountant Contact | project_accountant, accountant_contact | | Finance owner per branch |
| Status | status | yes | |
| Country, State, City, Location | country, state, city, location | country, state, city | Address hierarchy |
| Company, Division | company, division | division | Group structure |
| Header and footer images, radiology header/footer | files | | Branch specific letterheads |
| Default | checkbox | | Default branch |

### Clone Data
type (Medicine, Lab, Checklist Template v2), medical_unit_from, medical_unit_to. Copies master data between tenants.

## API endpoints observed
`/api/get_medical_unit/`, `/api/clinics/`, `/api/list_countries/`, `/api/v1/medical_units`, `/api/add_medical_unit/all_medical_unit_listing/`.

## Issues in current app
- Tenant list visible to tenant admin in Clone Data (lists other facilities): a data isolation risk.
- Two org setting screens, one dead.
- Branch, location, clinic and company overlap conceptually.

## Rebuild notes and extensions
- Clear hierarchy: Organization (legal entity, tax IDs, NTN) > Branch (facility) > Site/Building > Floor > Department/Unit.
- Vendor level "master data packs" (medicines, lab tests, ICD codes) that tenants subscribe to, instead of cloning between tenants.
- Branch specific numbering series (MRN shared across branches, invoice series per branch).
- Tenant feature flags and module licensing.
- Holiday calendars, working hours per branch.

## Open questions
- Is the MRN shared across branches? (Registration has Clinic as required, MRN likely global per tenant.)
