# S07 Store to Store Transfer

## Purpose
Move stock between stores (warehouse to pharmacy, main pharmacy to ER store) with a request and an issue note, keeping both stores' stock accurate.

## Screens in current app
| Menu | Route | Status |
|---|---|---|
| Store to Store Stock Transfer Request | /inventory/store/warehouse-transfer-listing | Dead route |
| Warehouse Transfer | /inventory/store/warehouse-transfer | Dead route |
| Warehouse Transfer Issue Notes | /inventory/warehouse-transfer/issue-note | Works: search transfers, issue |
| Store to Store Stock Issuance (listing) | /inventory/warehouse-transfer/issue-note-listing | Works: Sr, W.IN, Store From, Store To, Created On, Action; lines Item Code, Name, UOM, Available Qty, Qty |

## Rebuild notes and extensions
- Transfer order: from store, to store, lines, status (requested, approved, dispatched, in transit, received, discrepancy).
- In transit stock and receipt confirmation by destination.
- Automatic replenishment from warehouse to satellite stores based on par levels (S08).
