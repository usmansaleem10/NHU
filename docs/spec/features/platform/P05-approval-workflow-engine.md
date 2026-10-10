# P05 Approval Workflow Engine

## Purpose
Route documents (internal requisitions, purchase requests, purchase orders, work orders, leave, loans) through a defined chain of approvers. Enforces spending control and segregation of duties, and prints signature captions on documents.

## Users
Department heads, store incharge, supply chain manager, CEO, HR manager, configured by admins.

## Screens in current app
| Menu | Route | Purpose |
|---|---|---|
| Inventory > Add Policy type / Policy Types | /inventory/settings/add-policy-type, policy-type-listing | Policy per department and document type |
| Inventory > Reporting Flow Policy | /inventory/settings/reporting-flow-policy | Approval levels for inventory policy types |
| HR > Add Reporting Flow Policy / Reporting Flow Policies | /general-settings/add-reporting-flow-policy, reporting-flow-policy-listing | Approval levels for Leave and Loan |
| Inventory > Add Narration / Narration Listing | /inventory/settings/narration, narration-listing | Signature captions and IR rejection text |
| Inventory > Demand Type / Demand Priority | /inventory/settings/add-demand-type, add-demand-priority (+ listings) | Classify requests (General Items, Bio Medical, Inventory Store; Low, High) |
| Settings > Employee Role / Add employee role | /general-settings/employee-role-listing, add-employee-role | Approver roles with PO amount limits |

## Data captured

### Policy type
| Field | api_name | Req | Reason |
|---|---|---|---|
| Code, Name | code, name | yes | Identify policy |
| Department | department (multi) | yes | Which departments the policy applies to |
| Type | type: Internal Requisition, Purchase Request, Purchase Order, Work Order | yes | Document type |
| Status, Description | status, description | status | |

### Reporting flow policy (inventory)
Rows of levels: Level no, Type (Department / Generic), Roles (employee_role multi: Lab and Rad Manager, Pharmacy Manager, Nursing Manager, Biomedical Engineer, HR Manager, Manager, Manager Supply Chain, CEO...), Narration (Received By, Store Incharge, Issuing Authority, Department Incharge, Approved By), Settings: Can Edit? (approver may change quantities). Linked to policy types. Actions: append level, delete level, Save Policy.

### Reporting flow policy (HR)
| Field | api_name | Req |
|---|---|---|
| Code, Policy Name | code, name | yes |
| Policy Type | policy_type: Loan, Leave | yes |
| Status, Description | status, description | status |
| Internal levels | name: Section Head, Dotted Manager, Direct Manager; can_edit; is_paid | |
| External levels | employee_role; can_edit; is_paid | |

### Narration
code, name, description, rejection_narration ("(IR) Rejection Narration"), status.

### Demand type / priority
Demand type: code, name, description, status. Demand priority: priority (number), name, description, status.

### Employee role
code, name, description, status, po_amount_start_limit, po_amount_end_limit. Purpose: amount based PO approval routing and designation of approvers.

## Approval listings pattern
Tabs: Pending, Pending Reviews, Approved, Rejected (IR); In Process, Approved, Rejected (PR, PO, Leave, Loan). Filters by document no and department. IR approval also splits "Routine IRs" vs "Special Approval IRs" and shows IR Amount.

## Integrations
S02, S03, S04 (inventory documents), H02 leave, H04 loan, C05 adjustments, C20 doctor share approval, home dashboard pending approvals (P07).

## Issues in current app
- Two separate policy builders (inventory and HR) with different concepts.
- Employee Role is a third role concept beside login role and designation.
- No visible delegation, escalation or SLA.

## Rebuild notes and extensions
- One engine: `WorkflowDefinition(document_type, conditions)` > ordered `Steps(approver rule, min approvals, can_edit fields, narration/caption, SLA)`.
- Approver rules: by role in department, by reporting line (direct, dotted, section head), by specific user, by amount band, by cost center.
- Parallel and sequential steps, conditional skip (e.g. amount below limit), auto approve rules.
- Delegation (out of office), escalation after SLA, reminders via notification and email.
- Approve from mobile and from notification, with comments and attachments.
- Full timeline on each document; signature captions on print come from the step definition.
- Extend to: discounts, refunds, price changes, write offs, purchase of capital items, overtime, roster changes.

## Open questions
- How is "Special Approval IR" triggered (priority, amount, item type)?
- Does "Can Edit" allow increasing quantity or only reducing?
