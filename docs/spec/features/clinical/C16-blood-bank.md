# C16 Blood Bank

## Purpose
Request blood components for patients with clinical justification, track receiving and issue, and maintain bag inventory from donors with expiry.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Blood Bank > Blood Bag Requisition | /blood-bank/blood-requisition | Request form |
| Blood Requisition Listing | /blood-bank/blood-requisition-listing | Req No, Patient/MRN, Category (IPD/OPD), Blood Group, Component, Bags, Issued Qty, Date, Status (In progress, Requested, Issued, Cancelled) |
| Blood Requisition Receiving | /blood-bank/blood-requisition-receiving | Blood bank receives requests; Test List |
| Blood Bank Stock | /blood-bank/blood-bags-listing | Bags: Donor (reg no, gender, age), Donor Type, Group, Bag Number, Component, Collection and Expiry, Patient, Status (In Stock, Reserved, Issued, Discarded, Expired) |

## Requisition fields
| Section | Fields | Reason |
|---|---|---|
| Requisition | blood_group_id (req), priority (Normal/High, req), required_date, required_time, need_based, donor_available | Urgency and planning |
| Blood information (rows) | blood_component_id (req), blood_uom (ML), alternate_blood_group_id, required_bag (req), required_ml | What is needed |
| Clinical indications | hemoglobin below threshold, PTT above threshold, platelet count below threshold, active bleeding, prothrombin time, OBS/Gynae case, exchange transfusion, other reason, jaundice, clinical_diagnosis | Justify transfusion (audit) |
| Surgery | surgery flag, surgery_dates, surgery_type (Minor/Major), surgery_reason | |
| Other | moic (medical officer incharge, req), previous_transfusion and date, any_reaction, pregnancies, still_births, miscarriages, comments | Risk of antibodies and reactions |

## Rebuild notes and extensions
- Full donor lifecycle: donor registration (C22 shares donor record), screening questionnaire, deferral, collection, testing (TTI: HIV, HBV, HCV, syphilis, malaria), component separation, labelling with ISBT 128 barcodes.
- Cross match, compatibility, reservation per patient, issue with bedside verification, transfusion reaction reporting.
- Stock by group and component with expiry alerts, discard reasons.
- Replacement donor tracking (common in Pakistan: family provides donors).
- Haemovigilance reports.
