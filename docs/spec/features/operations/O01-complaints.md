# O01 Complaint Management

## Purpose
Staff log internal complaints (maintenance, IT, housekeeping, biomedical faults) and assign them to a department or person; track to closure.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Complaint Management > Add Complaint | /complaint-management | List with filters (dates, status All/Open/In Process/Closed, created by me/my department, assigned to me/my department, priority, location); form |

## Fields
| Field | api_name | Req |
|---|---|---|
| Title | name | yes |
| Description | description | yes |
| Location | location | yes |
| Priority | Low, Medium, High | yes |
| Contact Person | contact_person (employee) | |
| File Upload | | |
| Assign to Department | department | yes |
| Assign to Employee | assign_to | |

Home dashboard shows "Total Complaints".

## Rebuild notes and extensions
- Merge with O02 into one service desk: categories with default assignee team, SLA by priority, status flow, comments, attachments, satisfaction rating.
- Asset linkage (biomedical equipment) and preventive maintenance work orders.
- Patient complaints and feedback as a separate channel (QR on wards, SMS survey) feeding quality KPIs.
