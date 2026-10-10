# C06 Appointments and Queue

## Purpose
Spread OPD load across the day and show patients when it is their turn.

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| Front Desk > create slots page | /create-reservation/doctor-booking-slots | Doctor Name select; calendar with Previous/Next; Create Slots, Disable Slots, Delete Slots |
| Settings > QMS | /que-management | Token display by department; Token Type |

Related: OPD History shows "Visits / Bookings" toggle (bookings exist), token number, check in/out, waiting and treatment time.

## Data
Slot: doctor, date, start/end time, status (available, disabled, booked). Booking: patient, slot, status (active, cancelled). Token: number, department, doctor, called time.

## API endpoints observed
`/api/send_token_numbers/` (called on many screens: pushes token updates), `/api/system_admin_opd_control`, `/api/departments/`, `/api/get_medical_unit`.

## Rebuild notes and extensions
- Doctor schedules (recurring weekly templates, leaves, overbooking limits) generating slots automatically.
- Online booking (web, WhatsApp bot, call center) with SMS reminders and confirmations.
- Walk in plus appointment merged queue with priorities (elderly, emergency referral).
- Queue display screens and audio calling; patient self check in kiosk.
- Wait time analytics (door to doctor).
- Resource booking beyond doctors: ultrasound rooms, dialysis chairs, physiotherapy.
