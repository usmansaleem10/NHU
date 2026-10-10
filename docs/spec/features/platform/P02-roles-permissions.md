# P02 Roles and Permissions

## Purpose
Control which staff can see which screens, sections, actions and records. Hospitals need tight separation (cashiers cannot change prices, doctors see only their patients, payroll is confidential).

## Users
Tenant admin, IT.

## Screens in current app
| Menu | Route | Notes |
|---|---|---|
| Settings > Roles | /configuration/roles-v2 | Role list: Role Code, Role Name, Actions; Add Role |
| System Administration > Permissions | /system-settings/permissions | Select role, see its menu tabs, screen cards, per screen control checkboxes; Add Role, Update Role, Add Screen, add menu tab (+); card menu Update/Delete |

## How it works
See [roles-and-permissions](../../00-overview/roles-and-permissions.md) for the full model and the list of 32 roles. Summary:
- Role has custom menu tabs, each with sub menus and screens taken from a global screen catalog.
- Each screen has its own control list (sections visible, actions allowed, data scope). Loaded at runtime via `/api/role_screen_controls`.
- Extra scopes live elsewhere: branch allocation, patient type allocation, user stores, user wards, radiology sub departments, panel invoice restriction.

## Data captured
| Entity | Fields |
|---|---|
| Role | code, title, default_screen (landing page) |
| Role menu | name, icon, order |
| Role sub menu | name, icon |
| Role sub menu screen | name (label override), screen_id |
| Screen | name, url, url_type, is_active, is_display, is_bookmarked (per user) |
| Role screen control | screen, control key, enabled |

## Issues in current app
- Each role rebuilds its own menu, so menus drift and duplicate.
- Codes not unique, one role per user.
- Controls are screen specific strings; no consistent action vocabulary.
- Scopes spread over six mechanisms.

## Rebuild notes and extensions
- RBAC with permission strings `module.resource.action` plus scope (own, department, ward, store, branch, tenant).
- Multi role per user, plus per user grants and denies for exceptions, with expiry date (temporary cover).
- Permission sets bundled by job (templates) that tenants can clone.
- Navigation auto generated; role "workspace" only orders items and sets landing page.
- Field level security for sensitive fields (salary, CNIC, HIV results) and "break the glass" access with reason logging for restricted patient records.
- Permission change audit and periodic access review report.
- Admin UI: matrix view (roles x permissions) with search, and "view as user" preview.

## Open questions
- Which screen controls are used most? Collect the full control list per screen from the backend before migration.
