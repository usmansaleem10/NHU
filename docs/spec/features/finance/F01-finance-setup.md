# F01 Finance Setup (Chart of Accounts, Fiscal Years, Banks)

## Purpose
Configure the general ledger structure that all operational modules post into: books, account groups, chart of accounts with flex segments, fiscal years and periods, batches, voucher types, banks and cheque books.

## Screens in current app
| Menu | Route | Fields |
|---|---|---|
| Add Book of Account / Listing | /finance/configuration/add-book-of-account, book-of-account-list | name, is_active; Default flag. Books observed: "test", "Novo Care" |
| Add Flex Level / Listing | add-flex-level, flex-level-list | name, value |
| Add Flex Fields / Listing | add-flex-fields, flex-fields-list | book_of_account, flex_level; segments |
| Add Account Group / Listing | add-account-group, account-group-list | book_of_account, name, nature_of_balance (Debit/Credit), part_of (Income Statement/Balance Sheet), flex_segment_level, ag_identifier (Assets, Liabilities, Equities, Expenditures, Revenue) |
| Accounts Setup Identifier | accounts-setup-identifier | Name, Priority, Status (5 identifiers) |
| Add Chart of Account / List | add-chart-of-account, chart-of-account-list | book of accounts; list filter by book and status |
| Update Chart of Accounts | update-chart-of-account | Book, group levels; grid of 320 accounts: Code, Account Group, Name, Opening Balance, Closing Balance |
| Add fiscal year / List | add-fiscal-year, fiscal-year-list | name, start_date, end_date, book_of_account, description; list State and Status |
| Add Batch / Batch Lists | add-batch, batch-list | name, book_of_account, fiscal_year, fiscal_period, batch_type, state (Open/Close), status, description |
| Add Voucher Type / List | add-voucher-type, voucher-type-list | name, part_of_bank_reconciliation, cash, account_type (Payment, Receipt, Journal), status, description. Types: JV, CRV, CPV, BPV, BRV |
| Add Bank / Bank List | add-bank, bank-list | name, status |
| Add Bank Management / List | add-bank-management, bank-management-list | bank, bank_branch, payroll_bank, account_title, account_no, status, address, COA |
| Add Cheque Book / List | add-cheque-book, cheque-book-list | book_of_account, bank_management, starting_cheque_no, ending_cheque_no, status; Total Leaves |
| Cash Management | cash-management | Code, Name, Status (cash accounts/counters) |

COA codes are 12 digit segmented (e.g. 100100010001 Cash in Hand, 200100010001 Advance From Patients, 400100100001 Rents).

## Rebuild notes and extensions
- Segmented COA (company, branch, cost center, account, sub account) with dimensions on journal lines instead of separate books for testing.
- Cost centers mapped to departments; profit center per branch.
- Period close and lock, year end closing entries.
- Multi currency only if needed (USD shown as option).
- Seed a hospital COA template.
