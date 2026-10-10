# S09 Pharmacy Point of Sale

## Purpose
Sell medicines over the counter to walk in customers and outpatients, against prescriptions, with returns, holds and credit sale. High volume, speed critical, and a major revenue line.

## Users
Pharmacists, dispensers.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Pharmacy > POS (listing) | /pharmacy/point-sale-listing | Filters dates, patient name, invoice no, payment status (Paid/Unpaid). Columns Date/Invoice, Customer, Customer Discount, Adjustment, Net Total, Payment Status, Payment Mode, Print, Update; Export, Add New |
| Pharmacy > Point of Sale | /pharmacy/point-sale-v2 | Sale screen |

## Sale screen fields
| Field | api_name | Reason |
|---|---|---|
| Sale Return | checkbox | Switch to return mode |
| Patient MRN / select | mrn | Link sale to patient (history, panel) |
| Customer Name, Customer Phone | name, phone | Walk in customers |
| Product search | searchProductValue | Add items |
| External | externalBox | Possibly external prescription |
| Advised By | advised_by (doctor list with department) | Prescribing doctor, referral tracking and share |
| Lines | Product, Pack Qty (req), Unit Qty, Price, Discount, Total, Stock, Profit Margin, Action | Sell packs or loose units; margin visible to pharmacist |
| Flat Discount | receipt_disc | Bill level discount |
| Cash Received | cash_receipt | Change calculation |
| Payment Type | payment_type: Paid, Un-paid | Credit sale |
| Payment Mode | payment_method: Cash, Cheque, Credit Card, Bank Transfer | |
| Comments | comments | |
| Print Invoice? | checkbox | |
| Buttons | Credit Sale, Hold List, Hold, prev/next held sales, View Full Screen, R (reprint?), Print, Invoice | Parked sales during rush |

Store is taken from user store assignment (`/api/user_store/:id/`). Fixed POS discount per product and FBR tax on POS apply.

## Rebuild notes and extensions
- Barcode scanning, keyboard only operation, multiple tills.
- Prescription queue: e-prescriptions from C10 appear for dispensing, with substitution of generics and partial dispense.
- Batch selection FEFO, expiry block, controlled drug register with prescription capture.
- Customer loyalty, chronic patient refill reminders, home delivery orders.
- FBR POS integration with invoice QR.
- Returns only within policy, against original invoice.
- Shift close per till (same as C07).
