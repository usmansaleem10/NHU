# S10 Medicine Requests (Clinical to Pharmacy)

## Purpose
Medicines prescribed for admitted, ER, OT and OPD patients are requested from the pharmacy, approved, issued (fully or partially) and charged to the patient's bill. Returns of unused medicines are received back.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Inventory > Configuration > Medicine Request (v3) | /inventory/store/medicine-request-v3 | Main pharmacy queue |
| Pharmacy > Medicine Request v2 | /inventory/store/medicine-request-v2 | Older version |
| Pharmacy > Medicine Issuance Report | /reports/medicine-issuance-report | Per patient medicine amounts |

## Data
Filters: From/To date, MRN. Tabs by source: All, OPD, IPD, EMR, OT. Tabs by status: Requested, Approved, Partially Issued, Issued, Rejected. Columns: Drugs Information, Request/Approval/Issue Date, Prescribed Qty, Issue, Remaining Qty, Patient Information, Status, Action. Actions: Issue, Print Tag (medicine label), Receive Returned Medicine.

Medicine issuance report: report type (Admitted, Discharged, Deceased, FS Pending), ward, bed, referred from, patient type, doctor; columns Patient/MRN/Type/Status, Ward/Bed, To Dept, Consultant, Issued Medicine Amount, Returned Amount, Total, Admit/Discharge dates.

## Rebuild notes and extensions
- Pharmacist verification of orders (dose, interactions, allergies) before dispensing.
- Unit dose / daily cart dispensing per ward schedule linked to eMAR (C09).
- Ward stock (floor stock) vs patient specific dispensing.
- Automatic billing on issue, credit on return, and visibility in the running bill.
- Medicine labels with patient, drug, dose and Urdu instructions; barcode for bedside scanning.
