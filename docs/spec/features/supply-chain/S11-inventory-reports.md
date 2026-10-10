# S11 Inventory and Pharmacy Reports

## Report catalog (current app)
| Report | Route | Filters | Purpose |
|---|---|---|---|
| Current Stock | /inventory/reports/current-stock | store, product, show all/non-zero | On hand by store |
| Store Wise Ledger | /inventory/reports/stock-wise-ledger | dates, store (req), product | Item movement ledger |
| Pharmacy Profit/Loss | /inventory/reports/profit-loss-report | dates, store (req) | Margin |
| Stock Listing (Stock Index) | /pharmacy-config/stock | search, status; Export, Add New Record, Update status | Product name, supplier, pack qty, total amount, status |
| Category Wise Purchase Report | /inventory/reports/category-wise-purchase | dates, line item type, supplier | |
| Category Wise Stock Issuance | /inventory/reports/category-wise-stock-issuance | dates, type | Consumption |
| Line Item Wise Product | /inventory/reports/item-wise-report | store (req), line items, zero/non-zero | |
| Item Wise Stock Report | /inventory/reports/item-wise-stock | dates, store (req), type, product, transaction type (in/out), description | |
| Stock in Stock out | /inventory/reports/stock-in-out | dates, store, type, item, transaction type (req), description, MRN | |
| Supplier Wise Purchase | /inventory/reports/supplier-wise-purchase-report | dates, expiry (expired, near expiry), supplier, product, report type (Detail/Summary, req) | |
| Slow and Fast Moving | /inventory/reports/slow-fast-moving-report | dates (req), store, line item, category, sub category, generic, class, classification (Fast, Slow, Non Moving) | |
| Stock Movement | /inventory/reports/movement-report | dates, store (req), type, report type (Transaction wise/All), product | |
| Medicine Issuance Report | /reports/medicine-issuance-report | see S10 | |
| Inventory Dashboard | /inventory/dashboard | see P08 | Document tracker |

Note: "Category Wise Report v2" under Inventory reports is actually a payroll report (misfiled).

## Rebuild notes
- Core set: stock on hand with value, stock ledger, expiry report, ABC/VED analysis, consumption by department and cost center, purchase analysis by vendor, dead stock, reorder report, margin by item and store.
- All stock values at chosen valuation (weighted average or FIFO), consistent with GL.
