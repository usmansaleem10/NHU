# P07 Home Dashboard, Notifications and App Shell

## Purpose
Give every user a starting point: what needs my attention (approvals, tasks, complaints, leave), quick access to frequent screens, and global tools (search, notifications, branch switch).

## Users
All.

## Screens in current app
| Element | Route / location | Content |
|---|---|---|
| Home dashboard | /dashboard | "Welcome, name"; Reminder; Pending Approvals with counters IR Requests, PO Requests, PR Requests, GRN Requests, Work Order Requests and type filter (All, IR, PO, PR, GRN) with Details; Leave Requests; Tasks; Total Complaints; Inventory Requests; TimeTable; Favourite Screen (add bookmark); Change Password |
| Menu overview | /menu-details | Selected module's sections and screens as cards, star to bookmark; Department Notifications; Live Tech Support |
| Header | global | Screen search dropdown (all screens of role, "Module - Screen"), Change Branch, Change Language (English, Spanish), User Profile and messages, Shopping Cart, Audit Logs, Notifications, Settings (enable notifications, case tracking, support portal), System Messages, Sign Out |
| Sidebar | global | Modules with icons |
| Live tech support | floating headset button | Vendor support chat |

## Data
- User bookmarks: `/api/user_bookmark_screens/`.
- Pending approvals: `/api/approved_inventory/`, `/api/notify_pending_dues`.
- Pending dues notification (likely patient dues or vendor dues).
- Firebase push token.

## Issues in current app
- Dashboard widgets fixed; counters only for inventory approvals.
- Two step navigation (module overview page then screen) for every task.
- Shopping Cart in a hospital admin header without clear purpose.

## Rebuild notes and extensions
- Unified **inbox**: approvals, tasks, assigned complaints, results to review (critical lab values), messages, with actions inline.
- Role based home: front desk sees queue and today's appointments; doctor sees today's patients and pending results; store sees pending IRs.
- Command palette (Ctrl+K) for screens, patients, documents by number.
- Notifications center with categories, read state, mute, email/SMS/push preferences.
- In app announcements per department (replaces "Department Notifications").
- Recent items and favourites synced across devices.
- Support widget with context (current screen, tenant) and ticket link into O01/O02.

## Open questions
- What is "Shopping Cart" and "Case Tracking" used for?
