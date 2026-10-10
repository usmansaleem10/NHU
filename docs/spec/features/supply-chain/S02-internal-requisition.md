# S02 Internal Requisition (IR)

## Purpose
A department (ward, OT, lab, admin) requests items from a store. IRs go through approval (P05), then the store issues stock (S06). IRs are also the trigger for purchase requests when stock is insufficient.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Inventory > Create IR Request | /inventory/store/add-internal-requisition | Create IR |
| Inventory > IR Listing | /inventory/store/internal-requisition-listing | My/department IRs |
| Inventory > IR Approval | /inventory/store/internal-requisition-approval-listing | Approver queue |
| Inventory > Inventory Approval Listing | /inventory/store/ir-history | Approval history |

## Create IR fields
| Field | api_name | Req | Reason |
|---|---|---|---|
| Template | select (saved item lists e.g. "Gynaecology 2nd floor", "Emergency Demand", "Housekeeping") | | Recurring demands |
| Store | store | yes | Store to request from |
| Demand Type | demand type (General Items, Bio Medical Equipment Store, Inventory Store) | | Routing to policy |
| Demand Priority | Low, High | | Urgency |
| Status | Open | | |
| Prepared By | text (current user) | | |
| Location | location | yes | Delivery location |
| Lines | Code, Product (req), Last Demand, Stock In Hand (req, department's own stock), UOM, Qty Demand (req) | | Last demand and stock in hand justify the quantity |
| Remarks | textarea | | |
| Template Name + Save Template | | | Save current lines |

## Listing
Filters: IR No, Product Name, dates, Status (In process, Approved, Rejected), department. Columns: IR No, Store, Department, Location, Created On, Demand Type, Demand Priority, Status, Action; expandable lines: Code, Product, UOM, Qty Demand, Qty Approved.

## Approval
Tabs Pending IRs, Pending Reviews, Approved IRs, Rejected IRs; Routine vs Special Approval IRs; columns include IR Amount. Approvers may edit approved quantity if level "Can Edit".

## Rebuild notes and extensions
- Par level based auto requisition (S08): suggest quantities = par minus on hand.
- Consumption based forecasting per department.
- Department stock (sub store) visibility so "stock in hand" is computed, not typed.
- Partial issue and backorder tracking; IR to PR conversion when store is short.
- Mobile requisition from ward with barcode scan.
- Budget check per department and cost center.
