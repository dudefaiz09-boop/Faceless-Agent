# Phase 5 Demo Readiness Runbook

This runbook bundles the demo-data readiness steps for EduConnect after the mobile/shared API contract cleanup.

## Goal

Prepare a reliable sales-demo and QA dataset for two tenants with role coverage, seeded module data, verification, and reusable operator artifacts.

## Scope

This phase covers:

- Multi-tenant demo data verification
- Role coverage verification
- Parent/student linkage verification
- Assignment/submission coverage
- Fee status coverage
- Demo account matrix export
- Fees import sample CSV export
- Library import sample CSV export

## Commands

From the repository root:

```powershell
pnpm --filter @educonnect/functions seed:supabase
pnpm --filter @educonnect/functions verify:demo-seed
pnpm --filter @educonnect/functions export:demo-artifacts
```

Or run the full bundled command:

```powershell
pnpm --filter @educonnect/functions demo:ready
```

## Required environment variables

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. Never put it in web/mobile env files.

## Generated artifacts

The export command writes files under:

```text
audit/generated/
```

Generated files:

```text
demo-account-matrix.csv
fees-import-sample.csv
library-import-sample.csv
demo-tenants.json
```

These files are intended for operators, QA, and sales-demo preparation. They are generated locally and should be reviewed before sharing.

## Verification coverage

The verifier checks:

- `tenant-a` and `tenant-b` tenant records
- Required roles per tenant: admin, principal, teacher, student, parent, librarian, accountant
- Required module collections per tenant
- Parent records with linked students
- Assignment records with submissions
- Fees with both paid and pending status coverage

## Manual QA checklist after verification

1. Sign in as global admin and switch between demo tenants.
2. Verify Tenant A data does not appear in Tenant B views.
3. Sign in as each role and verify module access is correct.
4. Confirm parent portal only shows linked students.
5. Confirm teacher views show assigned classes and workflows.
6. Confirm accountant can access fees workflows but not unrelated admin areas.
7. Confirm librarian can access library workflows but not unrelated admin areas.
8. Run API smoke checks against the deployed API.
9. Build and install the Android APK and verify login plus core screens.

## Recommended next phase

After this phase passes, move to web UX/product QA:

- All Users modal alignment
- Dark mode text contrast
- Assignment list error-state handling
- Fees import/export UX
- User delete/update/role-change reliability
- Admin tenant switcher polish
