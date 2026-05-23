# Phase 13 Library and Parent Portal Shared API Boundary Runbook

This phase prepares the Library and Parent Portal pages for shared API service migration.

## Goal

Prevent web pages from drifting back to raw page-level API calls and make the remaining Library/Parent Portal migration work explicit and machine-checkable.

## What changed

A boundary audit script was added:

```text
scripts/audit-web-shared-api-boundaries.ts
```

Root command:

```text
pnpm audit:web-shared-api
```

The audit checks these pages:

```text
apps/web/src/pages/Library.tsx
apps/web/src/pages/ParentPortal.tsx
```

It reports whether the pages use their expected shared services:

```text
libraryService
parentPortalService
```

It also fails when raw `apiClient.request` calls remain in those pages.

## Current expected result

At the start of Phase 13, this audit may fail because the pages still need migration. That is intentional: the script creates a clear guardrail for the next implementation PR.

## Migration checklist

### Library

Replace page-level raw calls with `libraryService` methods:

- `resources()`
- `borrowHistory(uid)`
- `upload(data)`
- `updateResource(id, data)`
- `borrow(data)`
- `returnBook(data)`
- `deleteResource(id)`

### Parent Portal

Replace page-level raw calls with `parentPortalService` methods:

- `studentProfile(uid)`
- `studentBundle(uid, classId)`

## Exit criteria

Phase 13 is complete when:

- `pnpm audit:web-shared-api` passes.
- Library imports `libraryService` instead of `apiClient`.
- Parent Portal imports `parentPortalService` instead of `apiClient`.
- Web build still passes.
- No new page-level raw API calls are introduced.

## Regression checks

```powershell
pnpm format:check
pnpm audit:web-shared-api
pnpm --filter @educonnect/web build
```

## Follow-up

After this boundary audit lands, the next phase should perform the actual Library and Parent Portal page migration and then make the audit command part of CI.
