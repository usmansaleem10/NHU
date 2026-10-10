# Feature Index

57 features grouped in 6 areas. Priority is a first suggestion for the rebuild: **MVP** (needed to run a hospital day one), **V1** (needed soon after go-live), **Later**.

## P: Platform

| ID | Feature | Purpose | Priority |
|---|---|---|---|
| P01 | [Users, Authentication and Sessions](../features/platform/P01-users-auth-sessions.md) | User accounts linked to employees, login, session timeout, activity logs | MVP |
| P02 | [Roles and Permissions](../features/platform/P02-roles-permissions.md) | Role to menu to screen to screen-control access model | MVP |
| P03 | [Organization, Branches and Tenancy](../features/platform/P03-organization-branches.md) | Medical unit (tenant), branches, formats, logos, data cloning between tenants | MVP |
| P04 | [Master Data and Lookups](../features/platform/P04-master-data-lookups.md) | Departments, locations, lookups, configuration types, document types, staff types | MVP |
| P05 | [Approval Workflow Engine](../features/platform/P05-approval-workflow-engine.md) | Multi-level approval policies for IR, PR, PO, leave, loan | MVP |
| P06 | [Templates and Print Configuration](../features/platform/P06-templates-printing.md) | Rich text templates, report headers, invoice and prescription print controls | V1 |
| P07 | [Home Dashboard, Notifications and Shell](../features/platform/P07-home-shell-notifications.md) | Landing page, pending approvals, favourites, screen search, notifications, audit log | MVP |
| P08 | [Analytics Dashboards](../features/platform/P08-analytics-dashboards.md) | OPD, IPD, ward, lab, radiology, OT, HR, inventory, revenue dashboards | V1 |
| P09 | [Data Import and Export](../features/platform/P09-data-import-export.md) | Bulk upload and update via scripts and sample files | V1 |

## C: Clinical and Patient Flow

| ID | Feature | Purpose | Priority |
|---|---|---|---|
| C01 | [Patient Registration](../features/clinical/C01-patient-registration.md) | Create and find patients (MRN), demographics, guardian, photo, thumbprint, health card, wristband | MVP |
| C02 | [Patient Types, Panels and Companies](../features/clinical/C02-patient-types-panels.md) | Private vs panel/insurer patients, companies, groups; drives pricing and claims | MVP |
| C03 | [Service Catalog and Pricing](../features/clinical/C03-service-catalog-pricing.md) | Billable services (misc, lab, radiology, OT, visits), price lists per patient type | MVP |
| C04 | [Patient Services and Invoicing](../features/clinical/C04-patient-services-invoicing.md) | Order and bill services and consultations, tokens, payment collection | MVP |
| C05 | [Adjustments, Discounts and Cancellations](../features/clinical/C05-adjustments-discounts.md) | Discount, cancel service, cancel advance requests with approval | MVP |
| C06 | [Appointments and Queue](../features/clinical/C06-appointments-queue.md) | Doctor booking slots, QMS token display | V1 |
| C07 | [Cashier Sale Close and Cash Handover](../features/clinical/C07-cash-sale-close.md) | Shift close of cash, sale history, sale received by finance, income and expense | MVP |
| C08 | [Admission, Wards and Beds (ADT)](../features/clinical/C08-admission-wards-beds.md) | Admit, assign ward/bed, next of kin, ward and bed setup, bed status | MVP |
| C09 | [IPD Clinical Worklist](../features/clinical/C09-ipd-clinical-worklist.md) | Inpatient vitals, doctor visits, nursing and doctor notes, investigations, diagnosis, allergies | MVP |
| C10 | [OPD e-Prescription](../features/clinical/C10-opd-e-prescription.md) | Outpatient consultation: history, ROS, exam, diagnosis, medicines, orders, templates | MVP |
| C11 | [Emergency](../features/clinical/C11-emergency.md) | ER worklist and assessment, same clinical form as OPD with discharge and admission | MVP |
| C12 | [Final Settlement and Advances](../features/clinical/C12-final-settlement-advances.md) | IPD bill closing, advances, receivable and payable | MVP |
| C13 | [Laboratory (LIS)](../features/clinical/C13-laboratory-lis.md) | Lab order processing, sample collection, results, verification, test and parameter setup | MVP |
| C14 | [Radiology (RIS)](../features/clinical/C14-radiology-ris.md) | Technician acknowledgement, report writing, final sign, addendum, templates | MVP |
| C15 | [Operation Theatre](../features/clinical/C15-operation-theatre.md) | OT requests, scheduling calendar, approval, surgery record, ORs, checklists | V1 |
| C16 | [Blood Bank](../features/clinical/C16-blood-bank.md) | Blood requisition, receiving, bag stock | V1 |
| C17 | [Dialysis](../features/clinical/C17-dialysis.md) | Dialysis sessions (route currently broken) | Later |
| C18 | [Birth and Death Certificates](../features/clinical/C18-birth-death-certificates.md) | Issue birth and death certificates linked to patient | V1 |
| C19 | [Patient Medical Record](../features/clinical/C19-medical-record.md) | Longitudinal view of a patient's visits, vitals, history | V1 |
| C20 | [Doctor Share](../features/clinical/C20-doctor-share.md) | Revenue share policies for doctors, approval and payout | V1 |
| C21 | [Claims Management](../features/clinical/C21-claims-management.md) | Panel/insurer claims per admission | V1 |
| C22 | [Donations and Charity](../features/clinical/C22-donations.md) | Donor registration, zakat/sadqa donations, charity eligibility | Later |
| C23 | [Billing and Revenue Reports](../features/clinical/C23-billing-reports.md) | 25 operational revenue, cash, census reports | V1 |

## S: Supply Chain and Pharmacy

| ID | Feature | Purpose | Priority |
|---|---|---|---|
| S01 | [Inventory Master Data](../features/supply-chain/S01-inventory-master-data.md) | Products, item hierarchy, UOM, stores, vendors, manufacturers, taxes | MVP |
| S02 | [Internal Requisition (IR)](../features/supply-chain/S02-internal-requisition.md) | Department asks store for stock, with approval | MVP |
| S03 | [Purchase Request (PR)](../features/supply-chain/S03-purchase-request.md) | Store asks procurement to buy, with approval | V1 |
| S04 | [Purchase Order (PO)](../features/supply-chain/S04-purchase-order.md) | PO to vendor from PRs or independent, with approval | MVP |
| S05 | [Goods Receipt (GRN) and Returns](../features/supply-chain/S05-goods-receipt.md) | Receive against PO or directly, verify and post to finance, return to vendor | MVP |
| S06 | [Stock Issuance and Returns](../features/supply-chain/S06-stock-issuance.md) | Issue notes against IRs, returns from departments | MVP |
| S07 | [Store to Store Transfer](../features/supply-chain/S07-warehouse-transfer.md) | Transfers between stores and warehouse | V1 |
| S08 | [Stock Adjustment and Par Levels](../features/supply-chain/S08-stock-adjustment-par-levels.md) | Correct stock counts, min/max levels | V1 |
| S09 | [Pharmacy Point of Sale](../features/supply-chain/S09-pharmacy-pos.md) | Retail and patient medicine sale, returns, hold, credit sale | MVP |
| S10 | [Medicine Requests (Ward to Pharmacy)](../features/supply-chain/S10-medicine-requests.md) | Prescribed medicines requested by OPD/IPD/ER/OT and issued by pharmacy | MVP |
| S11 | [Inventory and Pharmacy Reports](../features/supply-chain/S11-inventory-reports.md) | Stock, ledger, movement, purchase, profit/loss, slow/fast moving | V1 |

## H: HR and Payroll

| ID | Feature | Purpose | Priority |
|---|---|---|---|
| H01 | [Employee Management](../features/hr-payroll/H01-employee-management.md) | Employee profile, official and banking info | MVP |
| H02 | [Leave Management](../features/hr-payroll/H02-leave-management.md) | Leave types, policies, requests, approval, rollover | V1 |
| H03 | [Roster and Attendance](../features/hr-payroll/H03-roster-attendance.md) | Shifts, rosters, biometric sync, attendance policies and reports | V1 |
| H04 | [Loans](../features/hr-payroll/H04-loans.md) | Employee loans with approval and payroll deduction | Later |
| H05 | [Payroll](../features/hr-payroll/H05-payroll.md) | Allowances, deductions, taxation, draft, pay run, verify, payslips | V1 |

## F: Finance and Accounting

| ID | Feature | Purpose | Priority |
|---|---|---|---|
| F01 | [Finance Setup (COA, Fiscal Years, Banks)](../features/finance/F01-finance-setup.md) | Books of account, account groups, chart of accounts, flex fields, fiscal years, batches, banks, cheque books | V1 |
| F02 | [Vouchers and General Ledger](../features/finance/F02-vouchers-gl.md) | Journal, payment and receipt vouchers in batches | V1 |
| F03 | [Payables](../features/finance/F03-payables.md) | GRN posting, invoice payable, vendor payments, billing payable | V1 |
| F04 | [Finance Integration Mapping](../features/finance/F04-finance-integration-mapping.md) | Auto-posting rules from billing, inventory, payroll, share into GL | V1 |
| F05 | [Financial Reports](../features/finance/F05-financial-reports.md) | Trial balance, income statement, balance sheet, ledger | V1 |

## O: Operations

| ID | Feature | Purpose | Priority |
|---|---|---|---|
| O01 | [Complaint Management](../features/operations/O01-complaints.md) | Internal complaints/tickets assigned to departments | Later |
| O02 | [Task and Project Management](../features/operations/O02-tasks-projects.md) | Internal task tracker with kanban, work orders | Later |

## Dependency sketch

```
P03 Org/Branch ─┬─> P04 Master data ─┬─> C02 Patient types ─> C03 Pricing ─> C04 Invoicing ─> C07 Cash close ─> F04 ─> F02 GL
                │                    ├─> S01 Inventory master ─> S02 IR ─> S03 PR ─> S04 PO ─> S05 GRN ─> F03 Payables
                │                    └─> H01 Employees ─> P01 Users ─> P02 Roles
                └─> F01 Finance setup (COA) used by masters (stores, vendors, taxes, allowances, leave/loan types)
C01 Registration ─> C10 OPD / C11 ER / C08 Admission ─> C09 IPD ─> C12 Final settlement ─> C21 Claims
C10/C09 orders ─> C13 Lab, C14 Radiology, C15 OT, S10 Medicine requests ─> S09 Pharmacy
```
