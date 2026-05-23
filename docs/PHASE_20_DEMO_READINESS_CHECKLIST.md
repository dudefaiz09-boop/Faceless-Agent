# Phase 20: Demo Readiness Checklist

## Purpose

This checklist summarizes the verification path after the recent shared API, library, and fees template hardening phases.

## Shared API boundary

- [ ] `pnpm audit:web-shared-api` passes locally and in CI.
- [ ] Web pages use exported shared API services instead of raw `apiClient.request` calls where an existing service boundary is available.
- [ ] CI runs the shared API boundary audit after the Prettier format check.

## Library workflow

- [ ] Student can view visible active library resources.
- [ ] Student can borrow a resource and see it in borrowing history.
- [ ] Borrowed records show due-date status.
- [ ] Overdue borrowed records are visually highlighted.
- [ ] Librarian can add, edit, and archive resources.
- [ ] Accountant cannot manage library resources.
- [ ] Archived resources are hidden from the active catalog.

## Fees workflow

- [ ] Staff can open the fees import modal.
- [ ] Staff can paste valid CSV rows.
- [ ] Staff can choose a CSV file for import.
- [ ] The sample CSV template is available under `apps/web/public/templates/`.
- [ ] Fee records can be exported as CSV.
- [ ] Student can view own fee summary and recent payments.

## CI checks

Expected checks before merging product changes:

- [ ] `pnpm format:check`
- [ ] `pnpm audit:web-shared-api`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] Shared package builds
- [ ] Functions build
- [ ] Web build
- [ ] Mobile lint and test when mobile paths are touched
- [ ] Android debug build when mobile paths are touched

## Demo smoke path

Use this order for a quick demo verification:

1. Sign in as admin and confirm tenant context is active.
2. Switch to a librarian account and verify Library management actions.
3. Switch to a student account and verify Library borrowing history and fee summary.
4. Switch to an accountant account and verify Fees import/export access.
5. Confirm restricted users cannot access management actions by URL or API.
