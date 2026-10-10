# O02 Task and Project Management

## Purpose
Internal tracker for tasks, bugs, enhancements and work orders, including HIMS support requests (tasks can reference a screen/report).

## Screens in current app
| Menu | Route | Content |
|---|---|---|
| PM Tool > Task List | /task-management/task-list | Views Table, Kanban, Lifecycle; filters dates, ticket ID, title, status (Open, Closed, In Progress), type (New feature, Enhancement, Bug, Deployment, Other), priority (Urgent, Normal, Medium, High, Low), location, project, tags, related to (HIMS Related/Others), assigned to (employee, department), created by (employee, department), screen/report, work order status (Work Order, Job Satisfaction, SAD), sort (creation or deadline), resolution time, tagged to me; Export |
| PM Tool > Add New Task | /task-management/add-task | Title, status, priority, location, project, file, department, contact person, telephone, external link, description; subtasks: Name, Start Date, Due Date, Allocated Time, Assign To |
| PM Tool > Add Priority / Add Status / Add Project | /task-management/task-priority, add-status, project | Status has color and default |
| PM Tool > PM Report | /task-management/user-status-report | dates, status, priority, employee, project |

List columns: Sr, Ticket ID, Title, Project/Type/Tag, Status, Priority, Created By/Date/Department/Location, Assign To/Department, Approval Status, Action.

## Rebuild notes
- Likely not core to a HIMS clone. Options: integrate with an existing tool (Jira, Linear) for vendor support tickets, and keep only work orders inside the HIMS via O01 service desk.
