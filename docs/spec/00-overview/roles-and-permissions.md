# Roles and Permissions

## Current model (observed)

Access is configured per **role**. Each user has exactly one role. A role contains its own menu tree:

```
Role (e.g. "Doctor")
└── Role menu (custom tab, e.g. "E_Medicine", "Worklist")    icon, name chosen per role
    └── Role sub menu (section, e.g. "IR", "Reports")
        └── Role sub menu screen  ->  Screen (global catalog: name, url, is_active, is_display)
            └── Screen controls (checkboxes specific to that screen)
```

Evidence: the session object `currentUser.role.role_menus[].role_menu_sub_menus[].role_menu_sub_menu_screens[].screen{url,name,is_display,is_bookmarked}`; the Permissions screen (`/system-settings/permissions`) that shows menu tabs, screen cards and checkboxes per screen; and the `/api/role_screen_controls` call made by most screens on load.

### Screen controls (fine-grained permissions)

Each screen exposes its own list of toggles. Example for the Doctor role on e-Prescription:

| Control | Type |
|---|---|
| General History, Review History, E Prescription, Consultation, Diagnosis, Medicines, Services, Referral, Vitals, Vaccination, Physical Examination, Nervous System | Section visibility |
| All Patient list, Dr patients list, Department Patient list | Data scope (whose patients appear) |
| Show Prescription Print Button | Action visibility |
| Disable Save, Disable Save and Discharge | Action restriction |

So "permissions" mixes three different concerns: which sections are visible, which actions are allowed, and which records are in scope.

### Other access dimensions

| Dimension | Where it lives |
|---|---|
| Super admin flag | `is_super_admin` on user, `/superadmin` dashboard |
| Branch access | User has `default_branch_id`, header "Change Branch", `/api/clinics/allocated_emp_branches/` |
| Patient type allocation | "patient_type_user_allocation" system control, `/api/patient_types/login_user_patient_types/`: users only see the patient types (panels) they are allocated to |
| Panel invoice restriction | Employee profile "Allow panel invoices: All / Non Panel Only / Panel Only" |
| Store access | `/api/user_store/:id/`: POS uses the user's store |
| Ward access | `/api/current_user_wards/`: IPD worklist shows the user's wards |
| Radiology sub departments | `/api/radiology_user_wise_sub_departments/` |
| User general controls | `/api/user_general_controls/:id`, `/api/user_front_desk_control/` (per user overrides) |
| Approval authority | **Employee Role** (separate from login role): Lab & Rad Manager, Pharmacy Manager, Nursing Manager, HR Manager, Manager Supply Chain, CEO etc., with PO amount limit range (`po_amount_start_limit`, `po_amount_end_limit`). Used by approval policies (P05) |
| Session timeout | Per user "Browser Session out (In Minutes)" |

## Roles found in this tenant (32)

Account and Finance Role, Administrator, Admin User, Billing Management, Bio Medical, calling reception, Doctor, Emergency V2, Front Desk, HR, HR + IR, IPD Staff, IR_Role, IR + Roster, Lab Front Desk, Lab Manager, Lab Technologist, Leave Role, Medical Superintendent, Nurse, Nursing Head, OT Role, Pharmacist, Pharmacy, Radiologist, Reception, Role for Anesthesia, Role for CEO, Role for NciH, Role For Surgeon's, Role Lab Technician For All, Roster.

Observations: role codes are free text and duplicated ("12" used four times); roles like "HR + IR" and "IR + Roster" exist because a user can only hold one role, so combinations become new roles.

## Recommended model for the clone

1. **Users can hold multiple roles**, and permissions are the union. Removes "HR + IR" style combination roles.
2. **Permission = resource + action + scope**, defined in code, not per screen checkbox lists. Example: `patient.read` scope `own|department|branch|all`, `invoice.discount.approve`, `prescription.print`.
3. **Navigation is derived from permissions**, not configured separately per role. Menu editing per role is replaced by a single global menu filtered by what the user can do. Optional "workspace" presets per role for ordering and favourites.
4. **Scopes are first class**: branch, department, ward, store, patient type (panel). One mechanism instead of six ad hoc ones.
5. **Approval authority is separate from access**: keep the "employee role / designation with amount limits" concept, but model it in the approval engine (P05), not in login roles.
6. **Field-level and section-level visibility** via feature flags per tenant (for configurable clinical forms), not via role permissions.
7. **Audit**: every permission change logged with who and when.
8. Seed default roles: Super Admin, Tenant Admin, Front Desk, Cashier, Doctor, Nurse, Nursing Head, Lab Tech, Lab Manager, Radiographer, Radiologist, Pharmacist, Store Keeper, Procurement, HR, Payroll, Accountant, Finance Manager, Medical Superintendent, CEO (read-mostly), Auditor (read only).
