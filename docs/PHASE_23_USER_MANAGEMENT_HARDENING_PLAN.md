# Phase 23: User Management Hardening Plan

## Why this phase matters

User management is the control center for a multi-tenant school platform. Admins must be able to safely create, update, deactivate, delete, and assign roles without direct database edits.

## Scope

This phase should focus on the existing user-management workflows rather than adding unrelated features.

## Areas to audit

### Web UI

- All Users page or equivalent user-management page
- Add-user modal layout and alignment
- Dark-mode readability in input fields, selects, tables, and modals
- Tenant switch controls for super-admin or admin workflows
- Role assignment controls
- User status controls
- Delete, deactivate, or restore actions

### Backend/API

- User creation route
- User update route
- Role update route
- User delete or deactivate route
- Tenant-scoped user listing route
- Permission checks for user-management actions
- Audit logs for privileged user actions

### Data model

- User profile document shape
- Role and permissions shape
- Tenant or school ID mapping
- Linked student IDs for parent accounts
- Class IDs, subject IDs, section IDs, and assigned modules

## Required behavior

- Admin can list users in the active tenant.
- Admin can add users with role and tenant context.
- Admin can update profile fields.
- Admin can change roles safely.
- Admin can deactivate or delete users according to supported backend behavior.
- Non-admin users cannot access user-management writes.
- Super-admin can switch tenant context if enabled.
- Parent accounts can be linked to one or more students.
- Teacher accounts can be linked to assigned classes or subjects.

## Regression checks

- Student cannot access All Users route by URL.
- Parent cannot access All Users route by URL.
- Teacher cannot change another user's role.
- Librarian cannot manage users.
- Accountant cannot manage users.
- Admin user changes stay within the selected tenant.
- Deleted or deactivated users cannot sign in or access protected app data.

## Suggested implementation order

1. Inspect existing page and route contracts.
2. Fix UI layout and dark-mode readability first.
3. Align frontend request payloads with backend schemas.
4. Add or repair tenant-scoped listing.
5. Add update, role-change, deactivate, and delete handling.
6. Add audit-log events for privileged actions.
7. Add tests for allowed and denied roles.
8. Run full CI and manual demo smoke checks.

## Exit criteria

- Admin can complete the full user lifecycle from the UI.
- Restricted roles cannot perform user-management writes through UI or API.
- User list, create, update, role change, and deactivate/delete flows work for a demo tenant.
- CI passes with format, audit, lint, tests, and builds.
