# S06 Stock Issuance and Returns

## Purpose
Store issues approved IR quantities to departments (issue note), reducing store stock and charging the department (cost center). Departments return unused stock.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Inventory > IR Issue Note | /inventory/store/internal-requisition-issue-note | Pick IRs ("Show pending IRs", search IR No), issue lines |
| Inventory > Issue Stock (listing) | /inventory/store/internal-requisition-issue-note-listing | |
| Inventory > IR Issue Note Return | /inventory/store/internal-requisition-issue-note-return | Return against issue note (search by MRN or Reference No) |
| Inventory > Return Stock (listing) | /inventory/store/internal-requisition-issue-note-return-listing | Tabs All, Received, Verified |

## Data
Issue lines: Item Code, IR No, Item Name, UOM, Available Qty, IR Qty, Issued Qty, Amount.
Issue listing filters: IN No, IR No, department, location, store, dates. Columns: IN No, IR No, IR Department, Store, Location, Created On, Status, Action; lines Item Code, Name, UOM, Available, Issued.
Return: date (req), prepared_by, search issue notes; listing: Reference No, Issue Note, Created On, Status, lines Code, Item, UOM, Issue Quantity, Return Qty.

## Rebuild notes and extensions
- Pick lists with FEFO batch suggestion, barcode scanning, partial issue with backorder.
- Department receipt acknowledgement (two step: issued, received).
- Department sub store stock so consumption is tracked to patients or cost centers.
- Patient chargeable consumables flagged at issue for billing.
