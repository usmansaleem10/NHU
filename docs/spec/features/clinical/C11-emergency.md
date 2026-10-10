# C11 Emergency

## Purpose
Assess and treat walk in and ambulance patients quickly, then discharge, admit (C08), refer, or send to OT. ER volume vs OPD is a headline KPI.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| In-patient > Emergency (v2) | /emergency/v2 | Same clinical form as OPD (C10): history, status, tele-medicine, vitals, allergies, investigations, examination, provisional diagnosis, treatment at discharge, diet plan, plan, review history, ROS, physical exam, vaccination, eye exam |
| Emergency > e-Prescription | /emergency | Older ER worklist: patient list filter All/Referral; buttons Assessment, Radiology, Laboratory, Transfer, Prescription, Admission, Rad Hist, Lab Hist, Patient Hist, History Taking |

ER vitals add weight, height, SPO2 and BSR columns in history table. "Save and Discharge" ends the ER visit.

## Rebuild notes and extensions
- Triage first: triage category (e.g. ESI 1 to 5 or Manchester colours), chief complaint, triage vitals, time stamps (arrival, triage, doctor seen, decision, departure).
- ER tracking board with bed/bay, status, waiting times and colour coding.
- Unknown patient quick registration (C01), MLC capture with police details.
- Resuscitation and procedure notes, observation stay billing.
- Ambulance handover record.
- Disposition: discharge, admit, transfer out, LAMA (with signed form), death.
- KPIs: door to triage, door to doctor, length of stay in ER, left without being seen.
