# Phase 6 Web Product QA Runbook

This phase is the product-readiness pass after mobile/API contract alignment and demo-data readiness.

## Goal

Validate the web app against the seeded two-tenant demo dataset and capture the highest-priority UX/product issues before sales-demo deployment.

## Generate the QA matrix

From the repository root:

```powershell
pnpm qa:web-matrix
```

This writes:

```text
audit/generated/web-product-qa-matrix.csv
```

Use the generated CSV as the manual QA tracker for role, tenant, scenario, expected result, and priority.

## Recommended setup before QA

```powershell
pnpm install
pnpm --filter @educonnect/functions demo:ready
pnpm qa:web-matrix
pnpm format:check
pnpm lint
pnpm test
pnpm --filter @educonnect/web build
```

Then run the deployed or local web app with the same Supabase/API environment used for the seeded demo data.

## Priority QA areas

### All Users

- Verify global admin tenant switching between `tenant-a` and `tenant-b`.
- Verify only selected-tenant records are visible.
- Verify add/edit user modal alignment at desktop and mobile widths.
- Verify role/module changes persist and update visible navigation.

### Dark mode and readability

- Check inputs, selects, modals, tables, cards, placeholders, and disabled states.
- Text should be readable without selecting or highlighting the field.
- Check empty, loading, and error states in dark mode.

### Assignments

- Teacher can view class assignments and submissions.
- Empty classes show an empty state instead of a fatal error.
- Student sees eligible assignments and submission status only.
- Parent sees linked child assignment visibility only.

### Fees

- Accountant can access fee workflows.
- Parent sees linked child fee records only.
- Import/export affordances are visible and understandable.
- Sample import CSV matches the expected import shape.

### Library

- Librarian can review library resources.
- Borrow/return/overdue states are represented clearly.
- Non-library roles have appropriate visibility or restrictions.

### Parent portal

- Parent only sees linked child data.
- Attendance, assignments, fees, and performance match seeded child records.

### Chat

- Contacts are role-eligible and tenant-scoped.
- Starting a chat does not expose cross-tenant users.

### Responsive web

- Dashboard, sidebar, modals, tables, and primary actions remain usable at mobile widths.

## Bug filing format

Use this format when creating issues or follow-up PR descriptions:

```text
Area:
Role:
Tenant:
Steps:
Expected:
Actual:
Priority:
Screenshot/video:
```

## Exit criteria

Phase 6 is complete when:

- `pnpm qa:web-matrix` generates the tracker.
- The matrix is executed against seeded demo data.
- Critical issues are either fixed or explicitly tracked.
- Web build, lint, tests, API smoke, and Android debug build pass for the release candidate.

## Next phase

After Phase 6, move to deployment release readiness:

- Verify Vercel web/API env vars.
- Run API Smoke workflow manually.
- Build Android artifact from GitHub Actions.
- Install APK on a real device.
- Validate login and top workflows for each seeded role.
