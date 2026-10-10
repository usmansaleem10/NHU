# S01 Inventory Master Data

## Purpose
Define what the hospital stocks (medicines, surgical items, equipment, general items), where it is stored, who supplies it, and how it is taxed and accounted. Clean masters are the base for procurement, pharmacy and costing.

## Screens in current app
| Menu | Route |
|---|---|
| Products / Add Product | /inventory/product, /inventory/product/add |
| Add Line Item (tabs Type, Category, Sub Category, Generic Name, Class) | /pharmacy-config/add-line-item |
| Add UOM / UOM | /inventory/settings/add-uom, uom-listing |
| Add Store / Stores | /inventory/settings/add-store, store-listing |
| Add Store Type / Store Types | /inventory/settings/add-store-type, store-type-listing |
| Store Categories | /inventory/settings/store-category-listing |
| Add Vendor / Vendors | /inventory/vendor/add, /inventory/vendor |
| Add Vendor Type | /inventory/settings/add-vendor-type |
| Add Manufacture / Manufactures | /inventory/settings/add-manufacture, manufacture-listing |
| Add Tax Type / Tax Type Listing | /inventory/settings/add-tax-type, tax-type-listing |
| Inventory Controls | /inventory/settings/system-controls |

## Product
| Field | api_name | Req | Reason |
|---|---|---|---|
| Item Type | item_type: General Item, Medicines | | Medicine specific fields |
| Code, Name | code, name | yes | |
| Generic Name | generic_name, generic_config | | Generic substitution, prescribing |
| Line Item | line_item: Therapeutic, Diagnostic, Medicine, Surgical instrument, Bio Medical Equipment, General Inventory, General Medicine | yes | Top level classification for reports |
| Category, Sub Category, Class | category, sub_category, class_config | cat, sub yes | Hierarchy |
| High Risk, Controlled Drug | high_risk, controlled_drug | | Safety and narcotics register |
| Status | status | yes | |
| Strength | strength | | e.g. 500mg |
| UOM | uom | | Unit, Each |
| UPC | upc | | Barcode |
| Is Consumable | is_consumable_item | | Consumable vs asset |
| Pack Size, Pack Quantity, Unit Quantity | pack_size, pack_quantity, unit_quantity | yes | Purchase in packs, sell in units (strips/tablets) |
| Rack | rack | | Bin location |
| Purchase Price, Sale Price | purchase_price, sale_price | | Default prices |
| Associated stores | store (multi) | | Which stores keep it |
| Patient Type | patient_type (multi) | | Panel specific availability/pricing |
| Fixed Discount % for POS | fixed_discount | | Automatic POS discount |
| Agreed Price | agreed_price | | Contract price with supplier |
| Manufacturer, Supplier | manufacturer, supplier | | |
| Acquire Type, Purchase Type | acquire_type, purchase_type | | Local/import, regular/emergency |
| Barcodable, Temperature Controlled, Expirable | is_barcodable, is_temp_control, is_expirable | | Handling and batch/expiry tracking |
| Short and Generic Description | short_desc, generic_desc | | |
| Price rows | Code, Description, Status, Price | | Additional price codes per variant |

## Store
code, name, address, capacity, store_type (req), country/state/city, store_category (req), parent_store, status, is_pharmacy_store, COA (book, group, subsidiary). Stores observed: IPD Store, ER Store, OPD Store, Warehouse, Bio Medical Equipment Store, Inventory Store, General. Listing shows "Is Main Store?".

## Store type
store_type_name, issue_user (can issue to user), can_procure, can_receive, is_warehouse, is_fixed_asset, status, description, COA. Purpose: capabilities of a store drive which documents it may create.

## Vendor
company_name (req), phone_no (req), email, ntn_no, country, state (req), city (req), head_office_address (req), vendor_type, is_filer (Filer/Non Filer, affects withholding tax), status, COA. List: Company Name, Email, Phone, Account No, Status.

## Manufacturer
code, name, contact_person, address, country/state/city, phones, mobile, email, fax, ntn, opening_balance, opening_date, end_date, comments, gl_account, status, COA (all mostly required). Manufacturer can act as supplier with ledger.

## UOM
unit_name, pack_size, status, description.

## Tax type
code, name, value, value_type (Percentage/Fixed), status, tax_payment_methods, service (misc service the tax maps to), applicable_on (Net/Gross), fbr_tax_applied_on (POS, Add service, Final Settlement, Advances), is_tax_adjustable, COA. Observed: Advance Tax 1%, Advance Tax 0.5%.

## Inventory controls (settings)
Report header alignment; IR fields control (enable stock in hand); IR report signature; store wise non zero products; IR last demanded qty fetch; IR issue note store; department and "apply department to all"; OT store; show qty on IR; POS store; show all IR items on PR; GRN auto verify; show IRs of all stores on issue note; issue note qty.

## Rebuild notes and extensions
- Item master with variants (brand under generic), multiple UOM conversions, barcode per pack level, GS1 support.
- Drug data: ATC code, formulary flag, DRAP registration number, look alike sound alike warnings.
- Batch and expiry mandatory for expirable items; FEFO picking.
- Vendor portal, vendor rating, contracts with price validity.
- Item categories mapped to GL via posting rules, not COA fields on each master.
- Asset register for fixed assets (biomedical equipment) with maintenance schedules.
