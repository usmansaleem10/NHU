# P01 Users, Authentication and Sessions

## Purpose
Give staff a login tied to their employee record, control session length, and keep an audit of who used the system and when. Needed for accountability (cash handling, clinical signatures) and for regulatory audit.

## Users
Tenant admin, HR (creating accounts for new staff), IT support.

## Screens in current app
| Menu | Route | Notes |
|---|---|---|
| System Administration > Create User | /system-settings/create-user-v3 | Current version: creates employee basics and login together |
| Front Desk > Create User | /system-settings/create-user-v2 | Older version: links login to existing employee/user |
| Settings > User Log Report | /reports/user-wise-status-report | Users by department and status |
| Settings > User Activity Log Reports | /reports/session-log-report | Session activity per user and date range |
| Header > Change Password | (dashboard) | Self service |

## Workflow
1. Search existing user or employee (search by Name, Emp ID, Phone, CNIC; filter Active/Inactive).
2. Fill identity, assign role, set password and session timeout, activate.
3. User logs in, selects branch if allocated to several; every screen visit posts to `/api/session_log/`.
4. Admin reviews activity logs.

## Data captured (Create User v3)
| Field | api_name | Type | Req | Reason |
|---|---|---|---|---|
| Salutation | title | select | yes | Display and print (Dr., Mr., Ms.) |
| First Name, Last Name | first_name, last_name | text | yes | Identity |
| Primary Contact | primary_contact | tel | yes | Contact and possibly OTP |
| Staff Type | staff_type | select (employee category list) | yes | Classifies the person (doctor, nurse, admin) for lists |
| Department | department | select | yes | Scope for worklists and reports |
| Designation | designation | select | yes | Job title |
| Show Doctor On Client Side | is_doctor | checkbox | no | Makes user selectable as doctor in clinical and billing dropdowns |
| Username | username | text | | Login |
| Password, Confirm Password | password, confirm_password | password | | Login |
| Role | role_id | select | | Access (P02) |
| Browser Session out (minutes) | browser_session | number | | Idle timeout per user (short for shared front desk PCs) |
| Status | status | checkbox | | Enable or disable login |
| v2 only: user/employee toggle | user | select User/Employee | | Create login for an existing employee |

User session object also holds: employee_id, doctor_department_id, is_super_admin, default_branch_id, licence_no, licence_type (professional licence for doctors), employee_designation, is_password_reset, is_user_review, app_version, entity_type.

Reports: User Log Report filters department_id, status. Session log filters From/To date and user.

## Integrations
H01 Employee (user is an employee), P02 Roles, P03 Branch allocation, all clinical modules (doctor lists use `is_doctor`).

## API endpoints observed
`/api/get_employees_by_type/`, `/api/v4/roles`, `/api/get_usernames`, `/api/new_all_users/`, `/api/session_log/`, `/api/get_auth_check/`, `/api/clinics/allocated_emp_branches/`.

## Issues in current app
- Two Create User screens (v2 under Front Desk, v3 under System Admin) with different models.
- Token in URL query string; user object cached in localStorage.
- No MFA, no password policy visible, no lockout visible.
- "Expired user all sessions at logout" is a global toggle hidden in invoice print controls.

## Rebuild notes and extensions
- Single user lifecycle: invite by email/SMS, set password, optional SSO (Google/Microsoft), MFA (TOTP/SMS) for finance and admin roles.
- Users and employees are separate but linked; external users (visiting consultants, panel auditors) possible without employee record.
- Professional licence (PMDC number, expiry) on clinician profile with expiry alerts.
- Session policy per role (timeout, concurrent sessions, IP or device restrictions for cash counters).
- Login history, failed attempts, and per record audit trail.
- Optional quick PIN switch on shared nurse station terminals.

## Open questions
- Is licence number used anywhere on prints (prescription, reports)?
- Is the session log used for payroll/attendance or only audit?
