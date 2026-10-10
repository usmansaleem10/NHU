# C10 OPD e-Prescription

## Purpose
Doctor's consultation screen for outpatients: history, review of systems, examination, vitals, diagnosis, medicines, investigations, diet and plan, then print prescription. Structured data feeds pharmacy (S10), lab, radiology, billing (requested services), and the patient record (C19).

## Users
Consultants, nurses (vitals), OPD assistants.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Out-patient > e-Prescription (OPD New) | /opd/v2 | Main consultation form, patient list |
| Out-patient > OPD History | /opd/opd-visit-history | Token, Date/Invoice, Patient, Consultant/Department, Check In/Out, Waiting/Treatment Time, Payment; filters doctor, department, Visits/Bookings, Status Active/Cancelled |
| Out-patient > Opd Prescription Template | /opd/prescription-config | Doctor templates: Presenting Complaint, Subjectives, Medicines, Diagnosis, Most Common Diagnosis, Investigation, Follow Up |
| Out-patient > OPD Prescription Configurator | /configuration/e-pres-config | Which form configuration applies: Code, Name, User, Department, Type, Status |
| Settings > Template Configuration | /configuration/prescription | Prescription templates list |
| Settings > Diagnosis V2 | /configuration/diagnosis-v2 | Diagnosis code and name master |
| Settings > Dose and Frequency Configuration | /configuration/medicine-config-v2 | Dose Type, Dose, Frequency, Route, Instruction |
| Prescription Controls, Template for OPD Prescription | see P06 | Layout |

Buttons: Previous History Alert, Previous History, Save New Template, Clear, Save, Save and Discharge, Assessment, Radiology, Laboratory, Transfer, Prescription, Admission, Rad Hist, Lab Hist, Patient Hist, History Taking, Dialysis Req.

## Data captured
| Section | Fields | Reason |
|---|---|---|
| Template | select template | Speed for common cases (e.g. "BR Asthma Child Oral Thrush") |
| Brief History, Current Status | text | Presenting complaint |
| Tele-Medicine | | Remote consult info |
| Vitals | weight, height, temperature, bp_systolic, bp_diastolic, pulse, o2_saturation, bsr (blood sugar random) | Baseline |
| Allergies | medicationsAllergies (multi), allergy search | Safety |
| Investigations | service_type, service_name, urgent, comments | Orders become Requested Services at billing |
| Provisional Diagnosis | ICD search, type Provisional/Differential/Final | Coding |
| Medicines (Treatment) | name, stock type (Dose Qty, Unit, Rotacaps, Sachet, Inhaler, Cream, Ointment...), dose type, dose (One Puff... Twice per week), duration type (Days, Weeks, Months), no_of_days, route (Topical, Via Nose, Inh via mouth, IM, Subcutaneous, Rectal, Vaginal...), comments | Prescription, pharmacy issue |
| Diet Plan | breakfast/lunch/dinner/snacks with time and comment | Dietary advice |
| Plan | text | Follow up |
| Review of Systems | about 90 checkboxes grouped: ENT/eyes, constitutional, cardiovascular, respiratory, endocrine, musculoskeletal, psychiatric, skin, GU, GI, allergy/immunology, neurological | Structured history |
| Physical Examination | 16 systems each Not Examined/Normal/Abnormal; GPE, Neurological, Skin, Musculoskeletal | Structured exam |
| Vaccination | DTP, DT Hib, Td (Adult), IPV/OPV, MMR, Hep B, Influenza, Pneumococcal, Mantoux | Immunisation history |
| Lifestyle | Namaz, Yoga, Tai chi, Meditation, other | Wellbeing |
| Eye exam | visual acuity left/right/both, pupils, intraocular pressure, refraction (SPH, CYL, AXIS, PD for distance and near, OD/OS) | Ophthalmology specialty |
| Problem list | e.g. COPD | Chronic conditions |
| Referral | All/Referral | Refer to other department |

Template config fields: medicine name, dose (BD, OD, TDS, SOS, STAT), days, from/to dates, diagnosis and type, investigation code, service type and name, comments, urgent.

## API endpoints observed
`/api/opd_prescription_configurator/get_opd_configurator/`, `/api/doc_fvt_screen/`, `/api/medicine_configurators`, `/api/radiology_configurators/`, `/api/service_type_configurator/`, `/api/patient_admissions/`, `/api/v4/icd_codes`, `/api/v4/allergy_types`, `/api/v4/templates`, `/api/v4/prescription_templates`.

## Issues in current app
- One giant form (about 300 inputs) for all specialties; specialty sections (eye exam) shown to everyone.
- Section visibility controlled through role permissions instead of specialty form config.

## Rebuild notes and extensions
- Form builder for specialty templates (general, paeds, gynae with obstetric history, ophthalmology, dental chart, physiotherapy).
- SOAP layout with smart defaults, "normal exam" one click, voice dictation and AI scribe (ambient transcription to structured note).
- Drug database with generics, brands available in pharmacy stock, dose calculators (paeds weight based), interaction and allergy checking, Urdu sig instructions on print.
- Order sets and favourite orders per doctor.
- Previous visit carry forward, timeline of past visits, results inline.
- e-Prescription sent to pharmacy queue and to patient via SMS/WhatsApp.
- Follow up booking directly from the consult.
- Growth charts for paeds, antenatal card for obstetrics.
- Coding: ICD-10, later ICD-11 and SNOMED CT.
