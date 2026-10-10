# S04 Purchase Order (PO)

## Purpose
Formal order to a vendor with quantities, rates, taxes and terms. Approved by amount based levels. Basis for receiving (S05) and payables (F03).

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Inventory > Purchase order Listing / Create PO Request | /inventory/purchase-order/listing | Listing |
| Inventory > Independent PO | /inventory/purchase-order/independent-po | Create PO (from PRs or standalone) |
| Inventory > "PR Approval" (actually PO approval) | /inventory/purchase-order/approval-listing | Approver queue |

## Create PO fields
| Field | api_name | Req | Reason |
|---|---|---|---|
| Date | date | yes | |
| Department, Location | department, location | | Requesting unit |
| Store | store | yes | Receiving store |
| Supplier Name | vendor | yes | |
| Search Type | All, Selected Supplier, Sale Based | yes | Item search scope; "Sale Based" suggests quantities from sales |
| Product search | searchProductValue | | |
| P.R No. | purchase_request_id (multi) | | Pull approved PR lines |
| Lines | Item/Code/UOM, Sold/Return/Available (PR qty / PR balance), PO Qty, Bonus Qty, Purchase Rate, Sale Rate, Discount, Tax (Advance Tax 1%, 0.5%), Total | | Bonus qty is common pharma trade practice |
| Rate history | Date, Rate, Vendor | | Price comparison |
| Advance Payment? and Amount | advance_payment, advance_payment_amount | | Vendor advance |
| Sum of Total, Discount, Taxes | sum_of_total, sum_of_discount, sum_of_taxes | | |
| Freight | freight | | Landed cost |
| Additional tax | additional_tax, additional_tax_value | | |
| Grand Total | grand_total | | |
| Mode of payment | mop: Cash, Credit | | |
| Remarks | remarks | yes | |
| Upload Images | | | Quotations |
| Template | select | | PO terms text (P06 templates: General Instructions, Terms and Conditions, Delivery Remarks, Warranty) |

## Listing
Filters: dates, PO No, Vendor, Department (multi), Status (Pending, Approved, Goods Receipt POs). Columns: PO No, Requested On, Vendor, PO Department, PR Department, Grand Total, Status, Action; lines with PR No, PR Qty, PR balance, PO Qty, Rate, LP Rate, discount, tax, totals, PO balance qty.

Approval: PO No, Vendor, Department, Created On, Grand Total, Status; filters PO No, Vendor, Department.

## Rebuild notes and extensions
- Approval by amount bands (Employee Role PO limits) through P05.
- PO amendments with versioning, cancellation, short close.
- Email/WhatsApp PO to vendor as PDF, vendor acknowledgement via portal.
- Blanket/rate contracts and scheduled deliveries.
- Three way match (PO, GRN, invoice) feeding payables.
- Landed cost allocation of freight across lines.
