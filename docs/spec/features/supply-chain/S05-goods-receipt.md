# S05 Goods Receipt (GRN) and Vendor Returns

## Purpose
Record goods received from a vendor against a PO (or directly for local purchases), capturing invoice, batch, rates, bonus and taxes. GRN increases stock and creates the vendor payable after verification. Returns send rejected or expired goods back.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Inventory > Create Auto GRN | /inventory/material/grn | GRN against PO list |
| Inventory > Create Independent GRN | /inventory/material/independent-grn | GRN without PO (local purchase) |
| Inventory > GRN Listing | /inventory/material/grn-listing | Tabs All, Received, Verified |
| Inventory > Verify GRN (GRN Posting) | /finance/manage-payable/grn | Finance verification and posting, see F03 |
| Inventory > GRN Return | /inventory/material/grn-return | Create return |
| Inventory > GRN Return listing | /inventory/material/grn-return-listing | |

## GRN fields
| Field | api_name | Req | Reason |
|---|---|---|---|
| Invoice No. | invoice_no | yes | Vendor invoice reference for payables |
| Invoice Date | invoice_date | yes | |
| Date | date | yes | Receipt date |
| Store | store | yes | |
| Department, Location | department, location (req) | | |
| Supplier | supplier | yes | |
| M.O.P | mop: Cash, Credit | yes | Cash purchases paid at once |
| PO No., PO Date | po_no, po_date | | Independent GRN reference |
| Prepared By | current_user_name | | |
| Lines (auto) | Item Code, Name, UOM, PO No, PO Qty, PO balance qty, Received Qty, Rejected Qty, Qty, Rate, Sale Price, Total, Discount %, Discount Amount, Tax Code, Tax Amount, Total Amount, LP Rates | | Partial receipts, rejection |
| Lines (independent) | Item/Code/UOM, Received Qty, Bonus Qty, Purchase Rate, Sale Rate, Discount, Tax, Total | | |
| Totals | sum_of_total, sum_of_discount, sum_of_taxes, freight (Over Head Cost), additional_tax, grand_total | | |
| Remarks | remarks | yes | |
| Template | | | Reuse item lists |

Batch number and expiry are not visible on the main form (may be in line popups). Verify with users.

## GRN listing
Filters: GRN No, Invoice No, Department, Location, Line Item, Supplier, Store, dates. Columns: GRN No, Date, Supplier, Grand Total, Store, Invoice Number, Created On, Status (Received, Verified), Action; lines as above.

## GRN return
GRN (select), prepared_by, remarks (req); lines: Item Info, Received Quantity, Bonus Return Qty, Item Return Qty (req), Discount, Tax Info, Total Price.

## Rebuild notes and extensions
- Batch, expiry, manufacturing date, serial numbers mandatory per item settings; barcode label printing on receipt.
- Quality inspection step with accept/reject and reasons.
- Sale price update rules (margin over cost, MRP from pack) with approval.
- Debit note generation on return, linked to payables.
- Cold chain temperature log on receipt for temperature controlled items.
