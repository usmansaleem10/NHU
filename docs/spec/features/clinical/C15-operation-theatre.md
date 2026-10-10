# C15 Operation Theatre

## Purpose
Schedule surgeries across operating rooms, approve requests with team assignment, record the actual surgery (times, team), run safety checklists, and bill procedures. OR utilisation is a major cost and revenue driver.

## Users
Surgeons, OT coordinator, anaesthetists, OT staff, OT incharge.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| OT > OT Request | /ot/create-request-v2 | Calendar (month, week, day) filtered by department; create request from a slot |
| OT > OT Request Approval | /ot/request-approval | Approve with room, date, time and team |
| OT > Surgery | /ot/surgery | Record surgery details per patient; Ot Requests list; Actions |
| OT > Define ORs | /ot/operation-room | Room master |
| OT > Ot Services | /ot/services-v2 | Procedure catalog |
| OT > Procedure Wise Report | /ot/report/procedure-wise-report | Report |
| OT > Check List Configuration | /configuration/check-list-setting-v2 | Checklist builder |
| Analytics > Dashboard OT | /dashboard/ot | Room status |

## Data captured
### Approval
| Field | api_name | Req |
|---|---|---|
| Operation Room | operation_room_id | yes |
| Confirm Date / Time | approved_date, approved_time | yes |
| Surgeons | operation_request_surgeons (multi) | yes |
| Assistant Surgeons | operation_req_assist_surgeons (multi) | yes |
| Anesthetist | anaesthetist_ids (multi) | yes |
| OT Staff | ot_staff_ids (multi) | yes |

### Surgery record
ot_service_id (operation name), operation_room_id, confirm date and time, start_surgery_date_time, end_surgery_date_time, surgeons, assistants, anaesthetists, OT staff.

### OR
code, name, floor_id, department_id, OR config type, status. Six rooms: OT 1, 2, 4, 5, 6 and Cath Lab.

### OT service
Procedure Code, Billing Code, Procedure Name, Type (Minor/Major), Department, Sub Department, Status.

### Checklists
Named checklists: Referral Form, Nutritional Screening and Assessment, Consent for Change in Treatment and Expenses, Consent for Anesthesia, Surgical Safety Checklist, Operation Theatre. Headings and items configurable.

### Report filters
dates, procedure, department, surgeon, ward, urgency (Low, Medium, High), operation room, type (Requested, Approved). Columns: Date and Time, Patient/MRN, Procedure/Department, Surgeon, Room, Urgency, Status.

## API endpoints observed
`/api/v4/operation_requests/all_requests`, `/api/v4/operation_requests/status_count`, `/api/v4/operation_rooms`, `/api/ot_services`, `/api/v4/ot_services`, `/api/get_hospital_doctors`, `/api/v4/users/get_referring_doctors`.

## Rebuild notes and extensions
- Block scheduling per surgeon/department, drag and drop calendar, conflicts check (room, surgeon, anaesthetist).
- Pre-op checklist completion gate, WHO Surgical Safety Checklist (sign in, time out, sign out) with timestamps.
- Anaesthesia record (pre-anaesthesia assessment, intra-op vitals, drugs), operation notes template, post-op orders.
- OT consumables and implants capture from OT store with billing and lot tracking.
- Utilisation KPIs: first case on time start, turnover time, cancellations with reasons.
- Surgeon and anaesthetist fees into doctor share (C20).
