# C07 Cashier Sale Close and Cash Handover

## Purpose
At shift end each cashier closes their sale: totals collected by mode, refunds, advances, settlements and petty expenses. Finance then confirms receipt of cash and bank deposits. This is the core cash control in a hospital.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Front Desk > Sale Close v2 | /sale/close-v2 | Tabs Services, Summary, Sale Information, Addition, Reduction. Columns Date/MRN, Patient Name/Type, Total Sale, Discount, Net Amount, Paid, Receivable, Payment Mode, Comment, Action; totals by Cash, Bank Transfer, Credit Card, Cheque. Comment; Current Sale, Sale History, Export, Sale Close |
| Front Desk > Sale History V2 | /sale/history-v2 | Tabs Sales History, Advance History: Sale ID, Date, Total, Discount, Paid, Receivable, Comments |
| Billing > Sale Received | /sale/received-v2 | Tabs Cash Received, Cash Received V2, Receivable Received, Un-Close Sales. Filters date type, dates, Sale ID, report type (Transaction/Sale wise). Columns Sale ID, User, Date, Net Sale, Discounts, Cash, Sale Amt, Received Amt, Remaining Amt, Credit Sale, Status, Received date, Deposited/Posted; breakdown Services, Refund Services, Cancel Services, Advances, Final Settlement, After Sale Close Adjustments; Bank deposit |
| Front Desk > Income / Expense | /configuration/expense-v2 | Date, Transaction, Type (Income/Expense), Amount, Name, Description, Status |

## Workflow
1. During shift the system accumulates the cashier's transactions (services, advances, final settlements, refunds, cancellations, open expenses).
2. Cashier reviews and clicks Sale Close with a comment.
3. Finance (Sale Received) marks cash received, notes shortfalls (Remaining Amt), records bank deposit, then posts to GL.
4. Receivables collected later are tracked under Receivable Received.

## API endpoints observed
`/api/search_on_close_sale/`, `/api/refund_services/`, `/api/refund_advances/`, `/api/search_advances/`, `/api/final_settlements/`, `/api/open_expenses`, `/api/cancelled_advances/`, `/api/cancelled_services/`, `/api/sales/`, `/api/closed_advances/`, `/api/user_sales/`, `/api/expenses`.

## Rebuild notes and extensions
- Cash drawer sessions: open with float, blind close (cashier counts denominations before seeing expected), variance with reason, supervisor sign off.
- Handover between cashiers mid shift.
- Bank deposit slips and reconciliation with bank statement import.
- Petty cash module with vouchers and approval rather than income/expense on the front desk.
- Auto GL posting on finance receipt (F04).
