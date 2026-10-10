# S08 Stock Adjustment and Par Levels

## Purpose
Correct system stock to physical counts (damage, expiry, count differences) and define par (min/max) levels per store to trigger replenishment.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| System Administration > Stock Adjustment | /inventory/product/adjustment-variant-wise | Store (req), Line Items, Product Name, Show Products (All, Zero, Non-zero); Save/Update |
| Inventory > Products Par Level | /inventory/store/products-par-level | Same filters (titled "Stock Adjustment" on screen) |

Stock reports show transaction descriptions: Stock Purchased, Stock Adjustment, Received From Other Store, Issued To Department, Issued To Other Store, Issued To Patient, Refund POS.

## Rebuild notes and extensions
- Physical count sessions (cycle counting by location/category), freeze, count entry via mobile scanner, variance review, approval, posting.
- Adjustment reasons (expired, damaged, theft, count variance) mapped to GL accounts.
- Par levels: min, max, reorder point, reorder qty per item per store; reorder suggestions report and auto PR/transfer.
- Expiry management: near expiry alerts, return to vendor, write off workflow.
