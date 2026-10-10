# Core Data Model (inferred)

Inferred from form field names and API resources. Field lists here are the backbone; each feature doc has the full field set.

## Organization

| Entity | Key fields | Notes |
|---|---|---|
| MedicalUnit (tenant) | title, address, phone_number, email, website_url, fax, organization_name_for_login_page, date_format, time_format, date_time_format, currency_type, currency_format, time_zone, entity_type (Patient/Customer/Visitor), logo images | API `/api/get_medical_unit` |
| Branch (clinic) | code, name, short_name, start_date, branch_head, contact, email, project_accountant, accountant_contact, fax, address, phone_number, status, country, state, city, location, company, division, header/footer images | `/api/clinics/` |
| Location | country > state > city > location | `/api/list_countries`, `list_states`, `list_cities`, `list_locations` |
| Department | id, name, floor, package, parent (sub department), code, type | `/api/departments`, `fetch_sub_department` |
| Ward | code, name, floor | `/api/active_wards` |
| Bed | code, name, type, status, ward | `/api/active_ward_beds`, `beds/filter_by_status` |

## People

| Entity | Key fields |
|---|---|
| Patient | mrn, title, first_name, last_name, father_name (guardian), gender, dob, age value and unit, blood_group, patient_nic (CNIC), phone and type, email, old_mrn, passport and country, sap_id, associated_emp_profile_no, mother_tongue, address, city, state, zip, country, location, clinic (branch), race, ethnicity, patient_type, company, group, family_mrn, guardian relation, mlc (medico legal case), employment_status, account_status, written_contact_preference, alternate_contact, ssn, is_zakat_eligible, photo, thumbprint |
| Employee | employee_file_no, salutation, names, hired_on, join_on, probation, contract, salary_model, confidential_salary, gender, dob, nic and expiry, passport_no, primary_contact, status, leaving reason and date, associated_mrn, job_type, staff_type, group, division, department, sub_departments, designation, employee_category, part_full_time, show_on_roster, shift, employee_role, card issue/return, restrict_panel_invoices, bank details |
| User | username, password, role, employee link, browser_session minutes, status, is_doctor (show doctor on client side), default_branch |
| Donor | patient-like record with donor type |

## Clinical encounters

| Entity | Notes |
|---|---|
| Visit / Encounter | type OPD, IPD, EMR; doctor, department, token, check in/out, waiting and treatment time |
| Admission | doctor, referred_to dept, sub dept, referred_from, ward, bed, procedure, package_amount, additional ward/bed, ref_visit, kin details, medical_officer (duty doctor), condition, comments, discharge type (Normal, LAMA, Referral, Deceased) |
| Vitals | weight, height, BMI, temperature, bp_systolic, bp_diastolic, pulse, resp rate, o2_saturation, bsr, shift |
| Diagnosis | ICD code, name, type (Provisional, Differential, Final) |
| Allergy | type, problem, reaction |
| Prescription item | medicine, dose type, dose, frequency, duration and unit, route, instruction, comments |
| Order (investigation/service) | service_type, service, referring doctor, urgent, comments |
| Notes | nursing notes and doctor notes per shift |
| Review of systems, Physical exam | about 90 boolean symptoms, 16 exam systems (Not Examined / Normal / Abnormal) |
| OT request / surgery | ot_service, operation_room, date/time, surgeons, assistants, anaesthetists, OT staff, start/end times, urgency |
| Lab order | lab id, test, specimen, sample from, status (Pending, Sampled, Received, Reported, Verified, Delivered) |
| Radiology order | accession no, service, department, priority (Routine, Same Day, Emergency), status (Pending, Acknowledged, Final Signed, Delivered, Cancel), report, addendum |
| Blood requisition | blood group, component, uom, bags, ml, clinical indications, surgery info, history |
| Birth / death certificate | see C18 |

## Billing

| Entity | Notes |
|---|---|
| Service | code / FBR ID, name, department, sub department, type, price per patient type, OPD/IPD/both, status |
| Price list | patient_type x service: OPD price, IPD price, both, S/D (special discount) OPD/IPD |
| Invoice / Sale | invoice no, patient, items, discounts, net, paid, receivable, payment mode, status, FBR invoice no |
| Advance | patient, admission, amount, mode, status (Active, Refunded) |
| Adjustment request | discount, cancel service, cancel advance; approval status |
| Final settlement | admission, base price, discount, net, cash, receivable, payable, status, posting date, hold |
| Sale close | cashier, period, services, refunds, cancellations, advances, settlements, expenses, totals by mode |
| Doctor share policy | doctor, services or visits, percentage/fixed, paid status |
| Claim | admission, company, ref visit, status |

## Supply chain

| Entity | Notes |
|---|---|
| Product | item_type, code, name, generic_name, line_item, category, sub_category, generic, class, high_risk, controlled_drug, strength, uom, upc, consumable, pack_size, pack_quantity, unit_quantity, rack, prices, stores, patient_types, fixed POS discount, agreed price, manufacturer, supplier, acquire_type, purchase_type, barcodable, temp controlled, expirable |
| Store | code, name, address, capacity, store_type, location, category, parent_store, is_pharmacy_store |
| Vendor, Manufacturer | see S01 |
| IR, PR, PO, GRN, Issue Note, Transfer, Return | header plus lines with qty demand, approved, issued, received, bonus, rate, tax, discount |
| Stock (batch) | product, store, batch, expiry, qty, purchase and sale rate |

## Finance

Book of Account > Account Group (nature Debit/Credit, part of Income Statement/Balance Sheet, flex segment, identifier Assets/Liabilities/Equities/Expenditures/Revenue) > Chart of Account (subsidiary, opening and closing balance) ; Fiscal Year > Fiscal Period ; Batch ; Voucher Type (Payment/Receipt/Journal; JV, CRV, CPV, BPV, BRV) ; Voucher ; Bank ; Bank account ; Cheque book.

## HR

Leave type, leave policy, leave request ; roster shift, shift location, roster, attendance record, attendance policy ; loan type, loan request ; allowance/deduction, taxation slab, fiscal payroll year, payroll draft, pay run, payslip.
