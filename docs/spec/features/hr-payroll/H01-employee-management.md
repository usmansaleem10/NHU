# H01 Employee Management

## Purpose
Single record per staff member: identity, employment terms, placement (department, designation, shift), approval role, and banking for salary. Feeds users (P01), rosters (H03), leave (H02), payroll (H05) and clinical doctor lists.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| HR > Employee Profiles | /employee-profile/staff | List: Authors (name), Department, Profile Status, Status, Action. Filters file no, name, department, designation, status, employee category; Export, Add New |
| HR > Employee Profile Form | /employee-profile/staff-profile | Tabs Basic Profile, Official Profile, Banking Information (plus Payroll button) |
| Payroll > Employee Detail | /payroll/employees-detail | Same list for payroll |

## Fields
### Basic profile
| Field | api_name | Req | Reason |
|---|---|---|---|
| Photo | profile_avatar | | ID card |
| Salutation | title: Mr, Ms, Dr | yes | |
| First, Middle, Last Name | first_name, middle_name, last_name | first, last | |
| Employee File No. | employee_file_no | yes | HR identifier, biometric device ID |
| Hired On, Joined On | hired_on, join_on (req) | | Service length |
| Probation period and unit, end date, completed | probation_period_type, probation_days, probation_end_date, probation_completed | | Leave eligibility (allowed_in_probation) |
| Contract period, unit, end date | contract_period_type, contract_days, contract_end_date | | Renewal alerts |
| Salary Model | salary_model: Sharing, Payroll, Internship, Commission | yes | Sharing = doctor share (C20) instead of salary |
| Confidential Salary? | confidential_salary | yes | Hide salary from regular HR users |
| Gender, Date of Birth | gender, dob | yes | |
| National ID, expiry | nic (req), nic_expiry | | |
| Passport No | passport_no | | |
| Primary Contact | primary_contact | yes | |
| Status | status | yes | |
| Reason of leaving, Leaving Date | reason_of_leaving: Terminated, Contract Ended, Resigned, Other | | Exit |
| Associated MRN | associated_mrn | | Employee as patient (staff medical benefit) |
| Comments | comments | | |

### Official profile
| Field | api_name | Req | Reason |
|---|---|---|---|
| Job Type | Permanent, Contract (also odd values Pulmonologist, Oncologist) | yes | |
| Staff Type | PCD Staff, Doctor, OT Staff, Admin Staff, Radiology Staff... | yes | |
| Group, Division | group, division | yes | Org structure |
| Department, Sub Departments | department (req), sub_department (multi) | | |
| Designation | 145 designations (CEO, Floor manager, Dispenser, Nurse...) | yes | |
| Employee Category | Trainee, Temporary (part time), Permanent (full time), Hired Doctor, Lab Technologist, OT Technician... | | Payroll grouping |
| Part/Full Time | Full, Part, Quarter Time | yes | |
| Show On Roster | Yes/No | | Include in rosters |
| Shift | default shift | | |
| Employee Role | approval role (P05) | yes | |
| Employee card issue/return date | issue_date, return_date | | Asset tracking |
| Allow panel invoices | All, Non Panel Only, Panel Only | | Billing restriction for cashier |

### Banking
bank_name (req), bank_account_no, branch_name, branch_code.

## Rebuild notes and extensions
- Effective dated employment history (transfers, promotions, salary changes) instead of overwriting.
- Documents (CNIC copy, degrees, licences) with expiry tracking; credentialing and privileging for doctors.
- Onboarding and offboarding checklists (user account, assets, clearance).
- Org chart with reporting lines (used by approvals).
- Employee self service portal (profile, payslips, leave, roster).
- Clean separation of Job Type and specialty.
