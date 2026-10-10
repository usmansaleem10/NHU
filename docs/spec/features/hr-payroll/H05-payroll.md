# H05 Payroll

## Purpose
Calculate monthly salaries from basic salary, allowances, deductions (absence, unpaid leave, loans, tax, EOBI), produce payslips and post to finance. Three step process: Draft, Pay Run, Verify.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Payroll > Generate Payroll (Draft Payroll) | /payroll/draft-payroll | Month, filters (file no, name, department, category); rows Name, Basic Salary, Payable Days, Allowances, Gross, Deductions, Net, LM's Salary (last month); expandable allowance/deduction detail (type, percentage/fixed, salary model, vary with days, no. of days, amount, taxation); Save, Create Draft PayRun, Export |
| Payroll > Pay Run | /payroll/pay-run | Month; Name, Gross Salary; Create PayRun, Revert PayRun, Export |
| Payroll > Verify Payroll | /payroll/verify-payroll | Month; Date of Payment, Employees, Total Net Pay; per employee; Verify PayRoll |
| Payroll > Fiscal Year payroll Setting | /payroll-settings/fiscal | name, start_date, end_date |
| Payroll > Day Wise Salary Settings | /configuration/day-wise-salary-settings | code, type (Monthly/Custom), working days for payroll (enable), working days from attendance (enable), description, payroll start day, end day, security deposit refund on resignation (allowance), exclude unpaid leaves from calculation |
| Payroll > Allowances and Deductions / Form | /payroll-settings/allowance-deduction-listing, add-allowance-deduction | allowance_name, is_deduction, is_miscellaneous, status, description, is_merged, COA |
| Settings > Taxation / Taxation Form | /payroll-settings/taxation-listing, add-taxation | title, fiscal_year, description, status, slabs (start salary, end salary, fixed amount, percentage), COA; Default flag |
| Reports | Department Name Wise Payroll, Payroll Report, Previous Pay-slip, Category Wise (v1, v2), Employee Report V2 (new joining/leavers), Allowance and Deduction Report | |

Allowances observed: Medical, Travel, House Rent, Overtime, Additional, Petrol. Deductions: Tax, Absent Days, EOBI, Unpaid Leave, Loan, Medical.

## Rebuild notes and extensions
- Salary structure per employee (effective dated components, formulas), grade based templates.
- Inputs locked from attendance, leave, overtime, loans, doctor share (for "Sharing" model), arrears, bonuses.
- Pakistan statutory: income tax slabs per FBR fiscal year, EOBI, provincial social security, withholding on doctor payments; annual tax certificates.
- Bank transfer file export (bank specific formats), payslip email/portal.
- Payroll journal auto posted (F04) with cost center split.
- Final settlement on exit (gratuity, leave encashment, loan recovery).
- Audit and four eyes on pay run.
