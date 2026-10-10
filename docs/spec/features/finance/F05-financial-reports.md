# F05 Financial Reports

## Screens in current app
| Report | Route | Filters |
|---|---|---|
| Income Sheet (Income Statement) | /finance/reports/income-statement | From/To (req), as of date, with/without zero values, book (req), fiscal year |
| Balance Sheet | /finance/reports/balance-sheet | book (req), fiscal year (req), zero values |
| Trial Balance | /finance/reports/trial-balance | From/To (req), as of, zero values, book (req), fiscal year, COA |
| Trial Balance Report V2 | /reports/trial-balance-report | From/To, book, fiscal year |
| Ledger of Account | /finance/reports/ledger-of-account | From/To (req), book (req), fiscal year, from COA and to COA (req), Detailed/Summary |

## Rebuild notes and extensions
- Standard statements with comparatives (prior period, budget), branch and cost center slicing, drill-down to vouchers and source documents.
- Cash flow statement, receivables and payables ageing, department profitability (revenue minus direct costs and allocated overheads).
- Export to Excel and PDF; scheduled month end pack.
