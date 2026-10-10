# F02 Vouchers and General Ledger

## Purpose
Record manual accounting entries (journal, cash and bank payments and receipts) and hold auto-posted entries from other modules, grouped into batches per fiscal period.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Finance > Create voucher (Manage voucher) | /finance/voucher-managing/batch | Filter Book of Account (req), Fiscal Year; batches: Batch Name, Fiscal Year, Period, Total Debit, Total Credit, Batch Posted, Status, Action; voucher lines: Subsidiary, Debit, Credit, Location, Description, Total; Add New Voucher |

## Rebuild notes and extensions
- Voucher entry with templates, recurring entries, reversals, attachments, approval before posting.
- Source document link on every auto entry (invoice, GRN, payroll run) for drill-back.
- Bank reconciliation (statement import, auto matching), cheque printing and register.
- Budget vs actual by cost center.
- Immutable posted entries; corrections only by reversal.
