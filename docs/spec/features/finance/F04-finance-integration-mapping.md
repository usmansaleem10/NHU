# F04 Finance Integration Mapping

## Purpose
Define how operational transactions (billing, advances, inventory issues, GRN, discounts, doctor share, claims) automatically become journal entries.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Finance > Payment Mode COA | /finance/configuration/payment-mode/coa | Tabs Service, Advance, Issue Items, GRN, Discount, Doctor Share, Claim Management, DeLink Inventory with Finance. Per payment mode (billing and share): voucher type, debit COA, credit COA. GRN: book, batch, voucher type, over head (freight) COA. Share: approval voucher type, payment voucher type per mode. IPD: loss amount against IPD bill (expense), recoverable deduction, tax deduction (asset). Enable flag |
| Finance > Finance and Billing System Controls | /finance/configuration/system-controls | Import billing toggle; book, batch; hospital services: JV voucher type, close voucher type, debit and credit COA; consultant services: voucher type, debit, credit |
| Finance > COA Mapping Services | /finance/manage-payable/coa-mapping-services | Map each service (by department, sub dept) to a revenue COA; filter mapped Yes/No |
| Finance > Assign Services to Doctor | /finance/configuration/assign-doctor-services | Doctor to services mapping (for consultant payables) |

Masters with embedded COA: store type, store, vendor, manufacturer, tax type, allowance/deduction, leave type, loan type, bank management, taxation.

## Rebuild notes and extensions
- Posting rules engine: `event type + conditions (branch, department, service category, payer, payment mode, item category)` gives debit and credit accounts plus dimensions. Versioned and testable with a simulator ("show me the entry this invoice would create").
- Events: invoice issued, payment received, refund, discount approved, advance received/adjusted, final settlement, claim submitted/paid, GRN verified, stock issued to department, stock adjusted, POS sale, payroll posted, share approved/paid, depreciation.
- Real time or batched posting with error queue (unmapped transactions) instead of silent failure.
- "DeLink inventory with finance" becomes a tenant feature flag.
