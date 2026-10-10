# P09 Data Import and Export

## Purpose
Bulk load and fix data (go-live migration, price updates, invoice corrections) without developer help.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Settings > Manage data V2 | /system-settings/manage-data | Tabs Manage Data, Insight Reports. Per script: Download Sample, Upload Data, Download Data, Update Data. Columns Script Name, Add New, Update; result log Invoice #, Patient MRN, Message, ID. 22 scripts |

Export buttons also exist on most listings and reports (Export, CSV Download, Download Excel).

## Issues in current app
- Scripts are opaque; no validation preview, no rollback visible.

## Rebuild notes and extensions
- Import wizard per entity: template download, upload, column mapping, validation preview with row errors, dry run, commit, undo window.
- Import jobs history with who, when, counts and error file.
- Exports async for large data, delivered as download link.
- Migration toolkit for go-live: patients, employees, products with opening stock and batches, price lists, COA with opening balances, open admissions and advances.
- Public API with API keys for integrations.

## Open questions
- Get the list of the 22 scripts and their columns; they reveal which data the hospital needed to bulk fix.
