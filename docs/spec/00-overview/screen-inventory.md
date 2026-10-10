# Screen Inventory

Every menu entry visible to the "Admin User" role, its route, and the feature doc that covers it. Flags: **DUP** route appears under several menus, **DEAD** route redirects to the dashboard (not registered or guarded), **OLD** older version kept beside a newer one.

## Settings (46 entries)

| Menu entry | Route | Feature | Flag |
|---|---|---|---|
| Add Roster Shift Location / Shift Location | /configuration/add-shift-location | H03 | DUP |
| Taxation | /payroll-settings/taxation-listing | H05 | DUP |
| Dashboard | /dashboard | P07 | hidden |
| Patient Discount Approval V2 | /patient/adjustments-approval-v2 | C05 | |
| User Log Report | /reports/user-wise-status-report | P01 | |
| Dashboard Master | /dashboard/master | P08 | DUP |
| Roles | /configuration/roles-v2 | P02 | |
| QMS | /que-management | C06 | |
| Leave Controls | /general-settings/leave-controls | H02 | |
| Organization Setting v2 | /system-settings/organization-settings-v2 | P03 | |
| Organization Setting v1 | /system-settings/organization-settings | P03 | DEAD, OLD |
| Configuration Lookup V2 | /configuration/lookup-v2 | P04 | |
| Patient Invoice Web/PDF Control | /system-settings/system-controls-v2 | P06 | DUP |
| Report Header Controls | /configuration/header-controls | P06 | |
| Patient Type | /configuration/patient-type-v2 | C02 | |
| Configuration Types | /configuration/config-types-v2 | P04 | |
| General Templates | /configuration/templates-v2 | P06 | DUP |
| Doctor visit fee | /doctor/visit-configuration | C03 | DUP |
| Manage data V2 | /system-settings/manage-data | P09 | |
| Shift Locations | /configuration/shift-location | H03 | DUP |
| Employee Detail | /payroll/employees-detail | H05 | DUP |
| Template Configuration | /configuration/prescription | C10 | |
| Doctor Share | /doctor/share-v2 | C20 | |
| Add Misc. Service V2 | /misc-services/add-v2 | C03 | |
| Misc Services V2 | /misc-services/v2 | C03 | |
| Employee Role / Add employee role | /general-settings/employee-role-listing, /general-settings/add-employee-role | P05 | |
| Roster Update | /roster/shifts-update | H03 | |
| Task List | /task-management/task-list | O02 | DUP |
| Taxation Form | /payroll-settings/add-taxation | H05 | |
| Diagnosis V2 | /configuration/diagnosis-v2 | C10 | |
| Intake / Outtake | /configuration/intake-output-config | C09 | |
| Department Management | /department/management-v2 | P04 | |
| Roster Shifts | /configuration/shift | H03 | DUP |
| User Activity Log Reports | /reports/session-log-report | P01 | |
| Add location | /configuration/countries | P04 | |
| Dose and Frequency Configuration | /configuration/medicine-config-v2 | C10 | |
| Document Type | /configuration/document-type-v2 | P04 | |
| Attendance Policy / Add Attendance Flow Policy | /roster/attendance-policy, /roster/add-attendance-policy | H03 | |
| Add staff type | /configuration/staff-type | P04 | |

## Complaint Management

| Add Complaint | /complaint-management | O01 | |
|---|---|---|---|

## Inventory (72 entries)

| Menu entry | Route | Feature | Flag |
|---|---|---|---|
| Create IR Request | /inventory/store/add-internal-requisition | S02 | |
| IR Approval | /inventory/store/internal-requisition-approval-listing | S02 | |
| IR Listing | /inventory/store/internal-requisition-listing | S02 | |
| Inventory Approval Listing | /inventory/store/ir-history | S02 | |
| Inventory Controls | /inventory/settings/system-controls | S01 | DUP |
| Create PR Request, Purchase Request Listing | /inventory/purchase-request/listing | S03 | DUP |
| PR Approval | /inventory/purchase-request/approval-listing | S03 | |
| Purchase order Listing, Create PO Request | /inventory/purchase-order/listing | S04 | DUP |
| Independent PO | /inventory/purchase-order/independent-po | S04 | |
| PO Approval (menu says "PR Approval") | /inventory/purchase-order/approval-listing | S04 | mislabelled |
| GRN Return listing | /inventory/material/grn-return-listing | S05 | |
| GRN Return | /inventory/material/grn-return | S05 | |
| Create Auto GRN | /inventory/material/grn | S05 | |
| Create Independent GRN | /inventory/material/independent-grn | S05 | |
| Verify GRN | /finance/manage-payable/grn | F03 | |
| GRN Listing | /inventory/material/grn-listing | S05 | |
| IR Issue Note | /inventory/store/internal-requisition-issue-note | S06 | |
| Issue Stock (listing) | /inventory/store/internal-requisition-issue-note-listing | S06 | |
| IR Issue Note Return | /inventory/store/internal-requisition-issue-note-return | S06 | |
| Return Stock (listing) | /inventory/store/internal-requisition-issue-note-return-listing | S06 | |
| Store to Store Stock Transfer Request | /inventory/store/warehouse-transfer-listing | S07 | DEAD |
| Warehouse Transfer | /inventory/store/warehouse-transfer | S07 | DEAD |
| Warehouse Transfer Issue Notes | /inventory/warehouse-transfer/issue-note | S07 | |
| Store to Store Stock Issuance | /inventory/warehouse-transfer/issue-note-listing | S07 | |
| Demand Priority Listing / Demand Priority | /inventory/settings/demand-priority-listing, add-demand-priority | P05 | |
| Add Narration / Narration Listing | /inventory/settings/narration, narration-listing | P05 | DUP |
| Add Policy type / Policy Types | /inventory/settings/add-policy-type, policy-type-listing | P05 | DUP |
| Reporting Flow Policy Listing | /general-settings/reporting-flow-policy-listing | P05 | DUP |
| Reporting Flow Policy | /inventory/settings/reporting-flow-policy | P05 | |
| System Controls | /general-settings/system-controls | H03 | DUP |
| Medicine Request | /inventory/store/medicine-request-v3 | S10 | |
| Products Par Level | /inventory/store/products-par-level | S08 | |
| Add UOM / UOM | /inventory/settings/add-uom, uom-listing | S01 | |
| Demand Type Listing / Demand Type | /inventory/settings/demand-type-listing, add-demand-type | P05 | |
| Add Tax Type / Tax Type Listing | /inventory/settings/add-tax-type, tax-type-listing | S01 | |
| Add Vendor Type | /inventory/settings/add-vendor-type | S01 | |
| Products / Add Product | /inventory/product, /inventory/product/add | S01 | |
| Inventory Templates | /configuration/templates-v2 | P06 | DUP |
| Add Store Type / Store Types | /inventory/settings/add-store-type, store-type-listing | S01 | |
| Store Categories | /inventory/settings/store-category-listing | S01 | |
| Add Manufacture / Manufactures | /inventory/settings/add-manufacture, manufacture-listing | S01 | |
| Add Store / Stores | /inventory/settings/add-store, store-listing | S01 | |
| Add Vendor / Vendors | /inventory/vendor/add, /inventory/vendor | S01 | |
| Add Line Item | /pharmacy-config/add-line-item | S01 | |
| Reports (10) | /inventory/reports/* and /payroll/category-wise-report-v2 | S11 | one payroll report misfiled here |

## Payroll (15)

| Employee Detail | /payroll/employees-detail | H05 |
|---|---|---|
| Pay Run | /payroll/pay-run | H05 |
| Verify Payroll | /payroll/verify-payroll | H05 |
| Generate Payroll (Draft) | /payroll/draft-payroll | H05 |
| Fiscal Year payroll Setting | /payroll-settings/fiscal | H05 |
| Day Wise Salary Settings | /configuration/day-wise-salary-settings | H05 |
| Allowance and Deduction Form / Listing | /payroll-settings/add-allowance-deduction, allowance-deduction-listing | H05 |
| Reports: Department Name Wise, Payroll Report, Previous Pay-slip, Category Wise, Category Wise v2, Employee Report V2, Allowance and Deduction Report | /payroll/*, /employee-profile/employee-list-report-v2 | H05 |

## HR (39)

| Employee Profiles / Employee Profile Form | /employee-profile/staff, /employee-profile/staff-profile | H01 |
|---|---|---|
| Leave Requests / Leave Approval / Add Leave Request | /leave/request-listing, approval-listing, add-request | H02 |
| Leave Types / Add Leave Type / Add Leave Policy / Leave Policies | /leave/type-listing, add-type, add-policy, policy-listing | H02 |
| Roster Shifts / Add Roster Shift / Create Roster / Roster Print / Gazetted Holidays / Refresh Attendance / Attendance Adjustment / Attendance Policy | /configuration/shift, add-shift, /roster/* | H03 |
| Attendance reports (Day, Status, Day Wise All, Late In Early Out) | /roster/employee-attendance-report, day-wise-status-report, day-wise-report, early-in-late-out | H03 |
| Loan Requests / Loan Approval / Loan Types / Add Loan Type | /loan/* | H04 |
| Add Banks / Add-Bank | /general-settings/bank-listing, add-bank | H04 |
| Add Reporting Flow Policy / Reporting Flow Policies | /general-settings/add-reporting-flow-policy, reporting-flow-policy-listing | P05 |
| System Controls | /general-settings/system-controls | H03 |
| Shift Locations | /configuration/add-shift-location, shift-location | H03 |
| Issue Death Certificate / Issue Birth Certificate | /patient-deceased/v2, /patient-baby-born/v2 | C18 |

## Blood Bank, Pharmacy, Analytics, RIS

| Blood Bag Requisition / Listing / Receiving / Stock | /blood-bank/* | C16 |
|---|---|---|
| POS listing / Point of Sale | /pharmacy/point-sale-listing, point-sale-v2 | S09 |
| Current Stock, Store Wise Ledger, Pharmacy Profit/Loss, Stock Listing, Medicine Issuance Report | /inventory/reports/current-stock, stock-wise-ledger, profit-loss-report, /pharmacy-config/stock, /reports/medicine-issuance-report | S11 |
| Medicine Request v2 | /inventory/store/medicine-request-v2 | S10 (OLD) |
| Dashboards (11) | /dashboard/*, /inventory/dashboard, /superadmin | P08 |
| Tech Acknowledgement, Report Addendum, Report Writing, Report Template, Radiology Templates v2, Radiology Services | /radiology/* | C14 |

## Billing Management (28)

| Final Settlement | /sale/final-settlement-v2 | C12 |
|---|---|---|
| Sale Received | /sale/received-v2 | C07 |
| Doctor Share Report, Share V3, Share Approval | /reports/share-wise-report, /doctor/share-v3, /doctor/share-approval-report | C20 |
| Day Book Report | /sale/close-history-by-services | C23 |
| 21 other reports | /reports/* | C23 |
| Price List Management | /pricing/v3 | C03 |

## Front Desk (13)

| create slots page | /create-reservation/doctor-booking-slots | C06 |
|---|---|---|
| Adjustment (hidden) | /patient/adjustments-v2 | C05 |
| Patient Services (hidden) | /patient/services-new | C04 |
| Patient Registration-v3 / Patient Registration (v2) | /patient/registration-v3, registration-v2 | C01 |
| Income / Expense | /configuration/expense-v2 | C07 |
| Doctor visit | /doctor/visit-configuration | C03 |
| Create User | /system-settings/create-user-v2 | P01 (OLD) |
| Patient Admission | /patient/admission-v2 | C08 |
| Sale Close v2 / Sale History V2 | /sale/close-v2, history-v2 | C07 |
| Current Bed Status Report V2 | /reports/bed-status-report-v2 | C08 |

## In-patient, Out-patient, Emergency, LIS, Dialysis

| IPD | /ipd/v2 | C09 | |
|---|---|---|---|
| Emergency v2 | /emergency/v2 | C11 | |
| Ward Management | /ward/management-v2 | C08 | |
| e-Prescription (OPD New) | /opd/v2 | C10 | |
| OPD History | /opd/opd-visit-history | C10 | |
| Opd Prescription Template | /opd/prescription-config | C10 | |
| Template for OPD Prescription | /pdf-reports/prescription | P06 | |
| Prescription Controls | /system-settings/prescription-controls-v2 | P06 | |
| OPD Prescription Configurator | /configuration/e-pres-config | C10 | |
| Emergency e-Prescription | /emergency | C11 | OLD |
| LAB Test Processing | /lab/lab-processing | C13 | |
| Lab Test | /lab/test-v2 | C13 | |
| Add Lab Test, Add Parameter, Lab Configuration, Lab Parameter (v1) | /lab/add-lab-test, add-parameter, configuration, parameters | C13 | DEAD |
| Lab Culture Configuration | /lab/culture-configuration | C13 | |
| Lab Configuration v2 / Lab Parameter v2 | /lab/configuration-v2, parameters-v2 | C13 | |
| Patient Dialysis | /dialysis/patient-dialysis | C17 | DEAD |

## Finance (36)

All `/finance/*` routes plus `/reports/trial-balance-report`: F01 (configuration), F02 (Create voucher `/finance/voucher-managing/batch`), F03 (Invoice Payable, Billing Payable, Verify GRN), F04 (Payment Mode COA, COA Mapping Services, Finance and Billing System Controls, Assign Services to Doctor), F05 (Income Sheet, Balance Sheet, Trial Balance, Ledger, Trial Balance V2).

## OT, Donation, System Administration, PM Tool, Claims

| OT Request Approval, OT Request, Ot Services, Procedure Wise Report, Surgery, Define ORs | /ot/* | C15 |
|---|---|---|
| Check List Configuration | /configuration/check-list-setting-v2 | C15 |
| Add Donation / Donation Report | /donation-registration/registration, /reports/donations-report | C22 |
| Stock Adjustment | /inventory/product/adjustment-variant-wise | S08 |
| Dashboard Master v3 | /dashboard/master-v3 | P08 |
| System_Admin | /system-admin | P03 |
| Permissions | /system-settings/permissions | P02 |
| Create User (v3) | /system-settings/create-user-v3 | P01 |
| Add Project / Add status / Task List / Add New Task / Add Priority / PM Report | /task-management/* | O02 |
| Pricing V2 | /pricing/v2 | C03 (OLD) |
| Patient Previous Medical Record | /patient-history/v2 | C19 |
| Clone Data | /system-settings/clone-data | P03 |
| Daybook Report V3 | /sale/daybook-report | C23 |
| Branch V2 / Add Branch | /configuration/branch-v2, add-branch | P03 |
| Staff Type | /configuration/staff-type-listing | P04 |
| Claim Management | /sale/claim-management | C21 |

## Summary of inventory hygiene issues

- 27 menu entries point to a route already used elsewhere.
- 8 routes are dead (redirect to dashboard).
- At least 9 screens have an older version still in menus.
- Several labels are wrong ("PR Approval" for PO approval, "Create PR Request" opens the listing, a payroll report under Inventory reports, "Medicine Request" under Inventory Configuration).
