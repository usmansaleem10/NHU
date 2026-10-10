# S03 Purchase Request (PR)

## Purpose
Store or department asks procurement to buy items not available in stock. Approved PRs become POs (S04). Separates "need" from "commitment to vendor".

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Inventory > Create PR Request / Purchase Request Listing | /inventory/purchase-request/listing | Listing with Add New |
| Inventory > PR Approval | /inventory/purchase-request/approval-listing | Tabs In Process, Approved, Rejected |

## Data
Listing filters: PR No, Start/End Date (req), Status (In process, Approved, Rejected). Columns: PR No, IR Department, PR Department, Demand Type, Demand Priority, Requested Date, Status, Action; lines: Code, Product, UOM, Qty demand, Qty Approved, L.P Rate (last purchase rate), Balance Qty, Required Date.
Approval columns: PR No, Department, Demand Type, Priority, PR Generation Date, Status.

Inventory control "Show all IR items on PR" means a PR can be generated from IR lines.

## Rebuild notes and extensions
- Auto PR from reorder points and from unfulfilled IR lines.
- Consolidation of PRs across departments into one PO per vendor.
- Request for quotation (RFQ) and comparative statement step for high value items.
- Budget and capex flags.
