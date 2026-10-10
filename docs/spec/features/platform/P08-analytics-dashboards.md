# P08 Analytics Dashboards

## Purpose
Management visibility over volumes, revenue, occupancy and productivity. Used by CEO, medical superintendent, department heads.

## Screens in current app
| Menu | Route | Widgets / content |
|---|---|---|
| Dashboard Master | /dashboard/master | Tabs All, OPD, IPD, Lab, Ward, Radiology, OT, HR, Blood Bank; OPD vs Emergency patients; Revenue breakdown by patient type, gender, top departments; Top 10 lab services; Top 10 radiology investigations; Patients visit wise. Period: Today, Last 3 days, Week, Month, 1 Year, Lifetime |
| IPD Dashboard | /dashboard/ipd | Top department visits, top busy wards, admission and 30 day readmission rate, average treatment cost, patient satisfaction |
| Ward Dashboard | /dashboard/ward | Bed map per ward and floor (Dialysis, Emergency Ward, General Ward, HDU, ICU, NICU 1, NICU 2, Nursery, PICU, Private Rooms), filter ward, export |
| Dashboard OPD | /dashboard/opd | Visits by gender, total visits, satisfaction, OPD vs ER, age wise, top 10 departments, top 10 doctors |
| Dashboard Radiology | /dashboard/radiology | Top 10 investigations, departments, referral departments |
| Inventory Dashboard | /inventory/dashboard | Document tracker: type (Indent Request, PR, PO, IR Issue Note, GRN), status, department, reference no; list with Requested By, Status |
| Dashboard HR | /dashboard/hr | Employees by department, category, designation, staff type, gender, shift |
| Dashboard OT | /dashboard/ot | Status per operating room |
| Dashboard Lab | /dashboard/lab | Top 10 tests, top 10 sections |
| Admin Dashboard (V2) | /dashboard/dashboard-v2 | Adds length of stay, waiting time, admission ratio |
| Super Admin | /superadmin | Tabs Stats, Leaves, Financial; transactions list (Date, MRN, Patient, Type, Net, Status) |
| Dashboard Master v3 | /dashboard/master-v3 | Filters date (Today... This Year), doctor, patient type, department, time period; doctor revenue table (patients, revenue, admissions, procedures); budget vs utilization by location (qty and amount: budget, utilized, remaining, excess); download Excel |

## API endpoints observed
`/api/v4/dashboard/chart_data`, `/api/v4/dashboard/ipd_dashboard`, `/api/v4/dashboard/opd_dashboard`, `/api/v4/dashboard/radiology_dashboard`, `/api/v4/dashboard/lab_new_dashboard`, `/api/v4/operation_requests/status_count`, `/api/v4/beds/filter_by_status`.

## Issues in current app
- Many overlapping dashboards (Master, V2, V3, Super Admin) with the same widgets.
- Fixed periods only, no comparison to previous period, no drill-down.
- Budget utilisation appears only here; no budgeting module visible.

## Rebuild notes and extensions
- KPI catalogue with definitions (ALOS, bed occupancy rate, readmission rate, door to doctor time, lab TAT, revenue per bed, collection rate, denial rate, stock out days).
- One dashboard framework: tiles from KPI catalogue, per role default boards, user customisation.
- Drill-down from KPI to list to record. Period comparison and targets.
- Real time operational boards (bed board, ER board, OT board, lab TAT board) on TVs.
- Scheduled email digests.
- Embedded BI option (Metabase/Superset) over a reporting schema.
- Budget module (department budgets by item category) to back the utilisation widget.
