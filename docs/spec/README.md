# HIMS Brain

Knowledge base for rebuilding the hospital information system currently running as "Hims Admin" (Camden Health System / Novocare deployment). It captures what the existing product does, why each part exists, the data it stores, and where a rebuild can do better.

Source: a read-only walkthrough of the live app on 2026-10-07 with an "Admin User" role (not super admin). Every menu screen available to that role (298 unique routes across 22 modules) was opened and its fields, options, buttons, table columns and API calls were recorded. Nothing was created, edited or submitted.

## How this repo is organised

| Path | What it holds |
|---|---|
| `00-overview/feature-index.md` | **Start here.** High-level list of every feature with a one-line purpose and a link to its detailed doc |
| `00-overview/system-overview.md` | Architecture observed (frontend, API, tenancy, branches), module map |
| `00-overview/roles-and-permissions.md` | How roles, menus, screens and per-screen controls work, list of roles found |
| `00-overview/cross-cutting-concepts.md` | Patterns used everywhere: lookups, approval flows, templates, COA linking, print controls |
| `00-overview/core-data-model.md` | Entities inferred from forms and APIs, and how they relate |
| `00-overview/screen-inventory.md` | Every menu entry and route, mapped to its feature doc, with duplicates and dead links flagged |
| `00-overview/pain-points-and-rebuild-principles.md` | What is wrong with the current app and the principles for the clone |
| `features/<area>/<id>-<name>.md` | One detailed doc per feature (workflow level) |

## Feature doc template

Every feature doc follows the same structure so they can be compared and fed to tooling:

1. **Purpose**: what the feature is for and why the hospital needs it
2. **Users**: which roles use it
3. **Screens in current app**: menu path and route
4. **Workflow and states**
5. **Data captured**: fields with type, required flag, options and the reason each exists
6. **Lists, filters and reports**
7. **Integrations**: other features it reads from or writes to
8. **API endpoints observed** (as called by the current frontend; useful for data migration)
9. **Issues in current app**
10. **Rebuild notes and extension possibilities**
11. **Open questions** to verify with users

## Conventions

- Field notation: `Label` (`api_name`, type, required). `api_name` is the Angular `formcontrolname`, which almost always matches the backend field name.
- "Reason" columns are our interpretation of why a field exists. They are inferred, not confirmed by the vendor, and should be validated with hospital staff.
- Personal data (patient, staff names) seen in dropdowns was deliberately left out.
- IDs: `P` platform, `C` clinical and patient, `S` supply chain, `H` HR and payroll, `F` finance, `O` operations.

## Status

Version 1, generated from screen analysis. Not yet covered: modal dialogs that only open on an existing record (edit, view, print), behaviour behind buttons that would create data, and screens hidden from this role. See "Open questions" in each doc.
