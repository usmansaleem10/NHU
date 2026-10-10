# H03 Roster and Attendance

## Purpose
Hospitals run 24/7 shifts. Rosters assign staff to shifts and locations; biometric attendance is synced and evaluated against the roster and an attendance policy (early in, late in, absent, overtime). Results feed payroll (absent days, overtime).

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Roster Shifts / Add Roster Shift | /configuration/shift, /configuration/add-shift | Shift master |
| Shift Locations / Add | /configuration/shift-location, add-shift-location | Code, Name, Description, Status |
| Create Roster | /roster/employee-shifts-new | Month, department (req), employee |
| Roster Update | /roster/shifts-update | Month, department, employee, location |
| Roster Print By Location | /roster/print | Month, department, location |
| Add Gazetted Holidays | /roster/add-gazetted-holiday | Name, Date, Status (11 holidays) |
| Refresh Attendance | /roster/refresh-attendance-v2 | Re-evaluate attendance for date range, department, employee |
| Roster Attendance Adjustment | /roster/attendance-adjustment | Manual correction by month, department, employee |
| Attendance Policy / Add Attendance Flow Policy | /roster/attendance-policy, add-attendance-policy | Thresholds |
| Policy For Attendance (Attendance Status Policy) | /roster/attendance-status-policy | Status matrix |
| System Controls | /general-settings/system-controls | Sync Employee, Sync Attendance (biometric devices) |
| Reports | /roster/employee-attendance-report, day-wise-status-report, day-wise-report, early-in-late-out | Day, status, all employees by day, late in early out; Print, Import, Export |

## Shift
code, name, time_from, time_to, description, used_for (Roster, Pharmacy, Doctor Visits, Clinical Notes), status, text color, bg color, next_day_check (night shift crosses midnight). Examples: Morning, Evening, Night, N (9PM to 6AM), E (4PM to 9PM), A (2PM to 2AM).

## Attendance flow policy
code, name, status, description; for Check In and Check Out each: early limit, late limit, absent limit, overtime limit with unit (min/hrs) and display color.

## Attendance status policy
Matrix of Check In status (On Time, Early In, Late In, Absent, Pending) x Check Out status (On Time, Late Out, Early Out, Absent, Pending) mapped to day status (Present, Absent). 25 combinations.

## Rebuild notes and extensions
- Roster builder grid (drag and drop), templates and rotating patterns, coverage rules per ward (min nurses per shift), skill mix.
- Shift swap requests with approval, open shift bidding.
- Device integration (ZKTeco and similar) via agent with real time push, geofenced mobile check in.
- Overtime calculation and approval feeding payroll.
- Attendance exceptions inbox for managers.
- Doctor duty rosters published to front desk for appointment availability.
