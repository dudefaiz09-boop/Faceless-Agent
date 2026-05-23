# Phase 21: Release Notes for Phases 14-20

## Summary

These notes summarize the recent stabilization work merged after the shared API boundary audit was introduced.

## Merged work

### Phase 14: Web shared API page migration

- Migrated Library page calls to the shared `libraryService` boundary.
- Migrated Parent Portal page calls to the shared `parentPortalService` boundary.
- Reduced direct page-level raw API calls where shared service boundaries already existed.

### Phase 15: CI enforcement

- Added `pnpm audit:web-shared-api` to the main CI workflow.
- Runs after `pnpm format:check` so formatting and boundary regressions fail early.

### Phase 16: Library overdue and role hardening

- Added due-state handling for borrowed library records.
- Surfaced due-soon and overdue states in the Library UI.
- Added an overdue Library stat.
- Aligned frontend and backend library manager access around admin, explicit `manageLibrary`, and `librarian` role checks.

### Phase 17: Fees sample CSV template

- Added a public fees import sample CSV template.
- Gives admins a stable reference for import column order.

### Phase 18: Public template documentation

- Added documentation for public import templates.
- Documented fees CSV required columns, status values, and validation expectations.

### Phase 19: Library role access documentation

- Added library role-access notes.
- Documented expected manager access and regression checks.

### Phase 20: Demo readiness checklist

- Added a focused demo-readiness checklist for shared API, Library, Fees, CI, and smoke testing.

## Product QA focus

Before a sales or stakeholder demo, verify:

- Library borrow and return paths for student and librarian accounts.
- Library management denial for non-library roles.
- Fees import using pasted CSV and selected CSV file.
- Fees CSV export for a selected class.
- Parent Portal data loading for linked students.
- CI remains green on app-code changes.

## Known follow-up candidates

- Wire the Fees sample download button directly to the public template file.
- Add automated tests for library manager permission combinations.
- Add API-level tests for denied Library writes by accountant, parent, and student roles.
- Add stronger import progress feedback for large Fees CSV files.
- Continue mobile expansion for parent and student workflows.
