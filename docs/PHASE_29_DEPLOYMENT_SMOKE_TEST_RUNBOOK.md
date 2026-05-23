# Phase 29: Deployment Smoke Test Runbook

## Purpose

This runbook defines the minimum checks to run before and after deploying EduConnect web, API, Supabase, and Android builds.

## Local validation before pushing a PR

Run these commands from the repository root before pushing a feature branch:

```powershell
corepack enable
corepack pnpm install --frozen-lockfile

corepack pnpm format:write
corepack pnpm format:check
corepack pnpm audit:web-shared-api
corepack pnpm lint
corepack pnpm test

corepack pnpm turbo build --filter @educonnect/shared
corepack pnpm turbo build --filter @educonnect/shared-api
corepack pnpm turbo build --filter @educonnect/shared-education
corepack pnpm turbo build --filter @educonnect/functions
corepack pnpm turbo build --filter @educonnect/web
```

If mobile files changed, also run:

```powershell
corepack pnpm --filter mobile lint
corepack pnpm --filter mobile test

cd apps/mobile/android
.\gradlew clean
.\gradlew assembleDebug
cd ../../..
```

Expected Android APK:

```text
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

## Required environment variables

### Web

Confirm the web app points to the deployed API, not localhost:

```text
VITE_API_BASE_URL
```

If the app uses an alternate variable name, document it beside this runbook and keep the deployed value consistent across Vercel and local `.env` files.

### API / functions

Confirm these are configured for the deployed backend environment:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
JWT_SECRET or equivalent auth verification config
CORS_ORIGIN or allowed frontend origins
```

### Mobile

Installed Android APKs must not point to localhost or `127.0.0.1`.

For emulator-only local testing, `10.0.2.2` may be valid. For a real device or distributed APK, use the deployed API base URL.

## Pre-deploy checklist

- Confirm the target branch is up to date with `main`.
- Confirm no open PR is waiting on failed CI.
- Confirm `format:check` is green.
- Confirm shared API boundary audit is green.
- Confirm backend and web builds are green.
- Confirm Android debug build is green when mobile files changed.
- Confirm the target Supabase project is staging/demo/production as intended.
- Confirm the deployed API base URL and web app environment variables match.

## Web smoke tests

After deploying the web app:

1. Open the deployed web URL in a clean browser profile or incognito window.
2. Confirm the app does not show a blank screen after refresh.
3. Sign in as a tenant admin.
4. Confirm the dashboard loads.
5. Confirm the active tenant context is visible or implied by data.
6. Visit these routes from navigation:
   - Dashboard
   - All Users
   - Attendance
   - Assignments
   - Fees
   - Library
   - Announcements
   - Parent Portal
7. Refresh each route once to catch client-side routing issues.
8. Confirm dark mode text remains readable in cards, forms, and modals.

## API smoke tests

After deploying the API:

- Confirm a public health route, if available, returns success.
- Confirm authenticated routes reject unauthenticated requests.
- Confirm tenant-scoped routes reject requests without tenant context.
- Confirm role-restricted routes reject users without permission.
- Confirm admin routes work for a valid admin in the active tenant.

## Tenant context error

A common backend error is:

```text
Tenant Context Required
x-school-id header or valid school-linked user token is required for all API calls.
```

If this appears:

1. Confirm the signed-in user profile has `tenantId` or `schoolId`.
2. Confirm the frontend API client sends the active tenant header when required.
3. Confirm the deployed web app is calling the correct API base URL.
4. Confirm the backend auth middleware can resolve the user profile.
5. Confirm super-admin tenant switching stores and sends the selected tenant.

## Android APK smoke tests

After building the debug APK:

1. Install the APK on an emulator or test device.
2. Open the app from a fresh state.
3. Sign in as a student.
4. Confirm these mobile modules load without crashing:
   - Attendance
   - Assignments
   - Fees
   - Library
   - Performance
5. Sign in as a parent.
6. Confirm Parent Portal loads linked-child summaries.
7. Confirm Library shows active borrowed and overdue counts when demo data includes borrow history.
8. Turn off network and confirm loading or error states are safe.
9. Restore network and retry failed screens.

## Demo account smoke path

Use seeded demo users when available:

- Global admin: verify tenant switching or managed tenant visibility.
- Tenant admin: verify users, fees, library, attendance, assignments, and announcements.
- Principal: verify school-level views.
- Teacher: verify attendance and assignments.
- Student: verify daily workflow modules.
- Parent: verify linked-child portal.
- Librarian: verify library management access.
- Accountant: verify fees access.

## Rollback notes

If a deployment fails after merge:

- Revert the merge commit or redeploy the previous known-good web/API artifact.
- Restore the previous environment variable set if the failure is configuration-related.
- Do not reseed production data as a rollback step.
- For demo or staging data issues, rerun the demo seed only after confirming the target project is not production.

## Exit criteria

Deployment readiness is acceptable when:

- Web app loads and survives refresh on primary routes.
- API rejects missing or invalid tenant context correctly.
- Admin, student, parent, librarian, and accountant role paths work.
- Android debug APK builds and opens successfully when mobile code changed.
- Demo seed data supports the planned stakeholder walkthrough.
