# F03 Payables

## Purpose
Turn verified goods receipts into vendor liabilities, pay vendors, and track amounts owed to consultants and other parties from billing.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Inventory > Verify GRN (GRN Posting) | /finance/manage-payable/grn | Filters dates, Book of Account (req), vendor, status Posted/Un Posted. Finance verifies GRN and posts payable |
| Finance > Invoice Payable | /finance/manage-payable/grn/invoice | Filters dates, book (req), vendor, MOP (req, Cash/Credit), status; tabs All, Un Posted. Columns Sr, Vendor/Created On, Invoice No/Date, PO No/Date, Total, Paid, Payable, Status, Pay, Voucher, Action; payment history Date and Time, Payment. Make Payment, Export |
| Finance > Billing Payable | /finance/manage-payable/services | Type (Services, Advances, Products), dates, book (req), patient type, category OPD/IPD, department, sub dept, user, service type (Hospital/Consultant), paid/unpaid, mode, posted/unposted, MRN, admission, invoice; Export CSV. Posts billing revenue and consultant payables to GL |

## Rebuild notes and extensions
- Vendor invoice entry with three way match (PO, GRN, invoice), price and quantity variance tolerance.
- Payment runs (select due invoices, approve, pay by cheque/bank file), withholding tax deduction by filer status, payment advice to vendor.
- Vendor ledger and ageing, advances adjustment against invoices, debit notes from returns (S05).
- Consultant payables from doctor share (C20).
