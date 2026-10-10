# H04 Loans

## Purpose
Employees request salary advances or loans, approved via reporting flow (P05), disbursed, and recovered through payroll deductions.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| HR > Loan Requests | /loan/request-listing | Status All, In process, Approved, Cancel, Rejected; Emp Id, Name, Department, Deduction Start, Status, State |
| HR > Loan Approval | /loan/approval-listing | Tabs In Process, Approved, Rejected; Employee, Department, Loan Type, Status |
| HR > Loan Types / Add Loan Type | /loan/type-listing, add-type | loan_type, bank_config (United Bank, Habib Metropolitan), status, is_security_deduction, COA |
| HR > Add Banks / Add-Bank | /general-settings/bank-listing, add-bank | bank_name, status, default |

## Rebuild notes and extensions
- Loan request: amount, purpose, installments, start month, guarantor; eligibility rules (max multiple of salary, service length).
- Installment schedule, early settlement, deferral.
- Auto deduction in payroll (H05) and loan ledger per employee.
- Security deposit deduction and refund on resignation (also in day wise salary settings).
