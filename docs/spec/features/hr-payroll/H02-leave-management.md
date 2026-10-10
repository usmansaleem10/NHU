# H02 Leave Management

## Purpose
Define leave entitlements by policy, let employees request leave with a replacement, approve through reporting flow, track balances, roll over and encash.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| HR > Add Leave Request | /leave/add-request | Request form with balance table |
| HR > Leave Requests | /leave/request-listing | Status: All, In process, Approved, Cancel, Rejected, Reversed; Emp Id, Name, Department, Approved Days, Status |
| HR > Leave Approval | /leave/approval-listing | Tabs Review, In Process, Approved, Rejected |
| HR > Leave Types / Add Leave Type | /leave/type-listing, add-type | |
| HR > Leave Policies / Add Leave Policy | /leave/policy-listing, add-policy | |
| Settings > Leave Controls | /general-settings/leave-controls | Leave, Leave Rollover (RollOver Month, RollOver Now) |

## Leave request
| Field | api_name | Req | Reason |
|---|---|---|---|
| Leave Type | leave_type | yes | |
| Full / Half Day | full_half_day | yes | |
| Start, End Date | start_date, end_date | yes | |
| Number of Days | number_of_days | | Computed |
| Replacement Person | replacement_person | | Duty cover |
| Location | location | yes | |
| File Upload | | | Medical certificate |
| Leave Address | leave_address | | Contact during leave |
| Reason | reason_for_leave | yes | |
| Balance table | Type, Balance, Available, Consumed, Remaining | | |

## Leave type
type_name, entitled_leave, short_leave, deduct_salary (unpaid), attachment_compulsory, no_of_days, only_hr_can_apply, allowed_in_probation, is_prorate_base, review_by (employee role), eligible_after, status, enable_custom_leave_approval_flow, COA (for encashment expense). Six types configured.

## Leave policy
policy_name and per leave type: total_leaves, roll_over flag and amount, encash flag and amount, status.

## Rebuild notes and extensions
- Holiday and weekend aware day counting (gazetted holidays from H03), sandwich rules.
- Accrual engine (monthly accrual, prorate by joining date).
- Calendar view of team leave, conflict warning with roster.
- Mobile self service and approval; auto roster update on approval.
- Comp-off for working holidays, short leave hours.
