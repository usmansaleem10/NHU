# C18 Birth and Death Certificates

## Purpose
Issue legally required birth and death certificates from hospital records, with recipient identification. Data must be accurate for civil registration (NADRA, union council).

## Screens in current app
| Menu | Route |
|---|---|
| HR > Issue Death Certificate | /patient-deceased/v2 |
| HR > Issue Birth Certificate | /patient-baby-born/v2 |

(Filed under HR menu, belongs to clinical/medical records.)

## Death certificate fields
| Section | Fields |
|---|---|
| Clinical | received_dead, diagnosis, type (Provisional, Differential, Final), post_mortem (Yes/No), comments, primary cause, secondary cause, underlying cause, treatment, significant conditions contributing to death, date/time of death |
| Deceased | CNIC, religion, occupation, marital status, place of birth, nationality at time of death, residential address |
| Recipient | name, relation, CNIC (req), contact (req) |
| Actions | Provisional Death Certificate, Save and Preview, Issue Deceased Certificate |
| List filter | Requested, All, Issued; search MRN, Name, Phone, CNIC, SAP ID |

## Birth certificate fields
| Section | Fields |
|---|---|
| New born | title, first and last name, gender, blood group, age and unit, dob, time_of_birth |
| Father | first and last name, CNIC, profession, phone, comments |
| Mother | MRN (links to mother patient), names, CNIC, phone, blood group |
| Other | birth_type (Vaginal, Natural, Scheduled Caesarean, Unplanned Caesarean, VBAC, Scheduled Induction), caesarean number, Gynae unit (ward), religion, birth place, address, nationality, state, city, ZIP |
| Recipient | recipient_name (req), relation_to_baby (req), CNIC (req), contact (req) |

## API endpoints observed
`/api/birth_certificates/`, `/api/active_wards`, `/api/lookups`, `/api/list_countries/`.

## Rebuild notes and extensions
- Generate from delivery record (labour room module: partograph, APGAR, birth weight) and death from discharge with disposition "Deceased".
- Cause of death per WHO format (ICD-10 chain).
- Certificate numbering, duplicate issue tracking, verification QR.
- Newborn auto registration with MRN linked to mother.
