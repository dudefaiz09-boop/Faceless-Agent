# Phase 23: User Management Regression Matrix

## Purpose

This matrix defines the minimum user-management checks that should pass before the user lifecycle is considered demo-ready.

## Role access matrix

| Actor role | List users | Create user | Update user | Change role | Delete request | View audit logs |
| --- | --- | --- | --- | --- | --- | --- |
| Super admin | Yes, managed tenants | Yes | Yes | Yes | Yes | Yes |
| Admin | Yes, active tenant | Yes | Yes | Yes | Yes | Yes |
| Principal | Read-only if allowed | No | No | No | No | No |
| Teacher | No | No | No | No | No | No |
| Student | No | No | No | No | No | No |
| Parent | No | No | No | No | No | No |
| Librarian | No | No | No | No | No | No |
| Accountant | No | No | No | No | No | No |
| Staff | No | No | No | No | No | No |

## Tenant checks

- Admin list results must be limited to the active tenant.
- Super admin list results must be limited to the selected managed tenant.
- Create, update, role-change, and delete-request actions must reject users outside the caller's active or managed tenant scope.
- Tenant selector changes should reset role, status, and module filters.

## Create user checks

- Missing email should fail.
- Missing display name should fail.
- Missing role should fail.
- Missing password for a new user should fail.
- Duplicate email should return a clear error or deterministic update behavior if intentionally supported.
- Parent users should support linked student IDs.
- Teacher users should support assigned class IDs and subject IDs.

## Update user checks

- Admin can update display name, status, role, modules, permissions, class IDs, subject IDs, section IDs, and linked student IDs.
- Email should not be edited from the manage modal unless the backend explicitly supports it.
- Role changes should update both primary role and roles array consistently.
- Permission changes should be persisted as a boolean permission map.

## Delete request checks

- Delete request should call the shared API users service delete boundary.
- Backend behavior should deactivate the account and record the action in audit logs.
- The user should no longer appear in active-only filters after deletion request.
- The user should appear when filtering inactive users.

## Bulk import checks

- CSV file selection parses expected headers.
- Missing required columns fail clearly.
- Multi-value fields support comma-separated values inside quoted cells.
- Import defaults to the selected tenant when tenant ID is omitted.
- Import results should report success and failure counts.

## Dark mode and modal checks

- Add user modal text is readable in dark mode.
- Manage user modal text is readable in dark mode.
- Bulk import modal text is readable in dark mode.
- Audit log modal text is readable in dark mode.
- Modal content scrolls on small screens.

## CI checks

Every user-management code PR should pass:

- `pnpm format:check`
- `pnpm audit:web-shared-api`
- `pnpm lint`
- `pnpm test`
- shared package builds
- functions build
- web build
