# Phase 34 Release Validation Runbook

This runbook turns the Phase 31-33 work into repeatable release evidence before sales demos or production deployment.

## Required automated checks

Run these from the repository root:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm format:check
corepack pnpm audit:web-shared-api
corepack pnpm lint
corepack pnpm test
corepack pnpm turbo build --filter @educonnect/shared
corepack pnpm turbo build --filter @educonnect/shared-api
corepack pnpm turbo build --filter @educonnect/shared-education
corepack pnpm turbo build --filter @educonnect/functions
corepack pnpm turbo build --filter @educonnect/web
corepack pnpm --filter mobile typecheck
corepack pnpm --filter mobile test
corepack pnpm --filter mobile build:android
```

Expected debug APK path:

```text
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

## Phase 31 backend tenant checks

Confirm the backend tenant coverage still runs as part of the test suite.

Evidence to capture:

- user management permission checks
- cross-tenant denial checks
- fees access checks
- assignments access checks
- attendance access checks
- library access checks

## Phase 32 web UI checks

Verify these pages in light and dark mode:

- Users
- Fees
- Library
- Assignments
- Attendance
- Parent Portal

Pass criteria:

- form text is readable before and after selection
- table text is readable
- modal content is readable
- error, warning, success, and empty states are readable
- keyboard focus indicators are visible on buttons, links, inputs, and selects

## Phase 33 mobile workflow checks

Install the APK on an Android device or emulator and verify:

- Attendance empty state can refresh
- Fees empty state can refresh
- Library empty search can clear search
- Library empty catalog can refresh
- Performance empty state can refresh
- Parent Portal can pull to refresh and retry errors
- loading, error, empty, stat, search, and pill components have useful screen-reader labels

## Release decision

Do not mark the release ready until all automated checks pass and the manual web/mobile evidence is captured.
