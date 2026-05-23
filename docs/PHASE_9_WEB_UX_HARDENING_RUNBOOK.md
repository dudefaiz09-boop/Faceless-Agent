# Phase 9 Web UX Hardening Runbook

This phase improves web usability on legacy pages without rewriting page components.

## Goal

Make dialogs, tables, filters, import previews, and small-screen layouts more reliable across light mode, dark mode, desktop, and mobile-width browsers.

## What changed

A UX hardening stylesheet is loaded after the dark-mode compatibility layer:

```text
apps/web/src/web-ux-hardening.css
```

It focuses on:

- Dialog centering and safe-area spacing
- Mobile modal max-height behavior
- Table overflow and readable cell alignment
- Visible keyboard focus states
- Dark-mode dialog backdrop and shadows
- Safer hover states on dark backgrounds
- Small-screen grid/truncation stability

## Priority QA surfaces

Validate the following pages and flows:

- All Users page
- Add or manage user modal
- Bulk import modal
- CSV preview table
- Audit logs modal
- Assignment list empty/error states
- Fees import/export screens
- Library resource screens
- Parent portal cards and tables

## Manual checks

1. Open the web app in light mode.
2. Test the priority surfaces at desktop width.
3. Resize to a mobile-width viewport and repeat.
4. Toggle dark mode and repeat.
5. Confirm dialogs are centered, scrollable, and not clipped.
6. Confirm tables and import previews do not break the layout.
7. Confirm keyboard focus is visible on buttons, links, inputs, and selects.
8. Confirm hover states remain readable in dark mode.

## Regression commands

Run before merging this phase:

```powershell
pnpm format:check
pnpm --filter @educonnect/web build
```

## Follow-up

This compatibility layer should be followed by targeted component-level cleanup in:

- `apps/web/src/pages/Users.tsx`
- Assignments page
- Fees page
- Library page
- Parent portal page

Future UI PRs should prefer explicit component classes over broad compatibility overrides.
