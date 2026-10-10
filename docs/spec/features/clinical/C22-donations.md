# C22 Donations and Charity

## Purpose
Many Pakistani hospitals run on charity: zakat, sadqa and general donations fund treatment for eligible patients. The system records donors and donations, and flags patients eligible for charity.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Donation > Add Donation (Donation Registration) | /donation-registration/registration | Donor information form (patient-like): title (incl. M/S for companies), names, guardian, blood group, gender, age, dob, CNIC, contact, old MRN, email, country, passport, SAP ID, address hierarchy, Donor Type (patient types), company, group; Picture, Impression (thumb); Add Donation |
| Donation > Donation Report | /reports/donations-report | Filters dates, patient type, company, group, Donation Type (Zakat, Donation, Sadqa, Donation In-Kind) |

Related: "Eligible for Charity?" on registration, "Other Services" donation lines at the counter (C04), Donation service type, blood donors (C16).

## Rebuild notes and extensions
- Donor CRM: individuals and organisations, pledges, recurring donations, receipts with tax exemption certificate details.
- Fund accounting: separate funds (zakat must be used only for eligible beneficiaries), fund balances.
- Beneficiary assessment (social welfare officer interview, income, eligibility approval) and allocation of fund to patient bills.
- In-kind donations into inventory.
- Donor reporting: how funds were used.
