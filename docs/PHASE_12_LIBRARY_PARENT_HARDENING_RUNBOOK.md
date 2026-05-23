# Phase 12 Library and Parent Portal Hardening Runbook

This phase improves Library and Parent Portal usability after the Fees workflow hardening phase.

## Goal

Keep library catalog cards, borrow history, resource upload modals, linked-child tabs, parent summary cards, and academic workflow panels readable and stable across light mode, dark mode, desktop, and mobile-width browsers.

## What changed

A combined workflow hardening stylesheet is loaded after the fees workflow layer:

```text
apps/web/src/library-parent-hardening.css
```

It improves:

- Library resource card contrast
- Subject filter hover/selected states
- Borrow status chip readability
- Library upload modal readability
- Parent portal linked-child tab readability
- Parent summary card readability
- Parent academic workflow panel contrast
- Long title, tag, feedback, and student text wrapping
- Mobile rounded-card and grid spacing behavior

## Library QA checklist

Validate these workflows in light and dark mode:

1. Librarian opens the Library page.
2. Librarian filters by subject.
3. Librarian searches by title or tag.
4. Librarian adds a new resource.
5. Librarian edits an existing resource.
6. Librarian checks resource upload modal readability.
7. Student opens catalog.
8. Student borrows a resource.
9. Student checks borrowing history.
10. Empty catalog and empty history states remain readable.

## Parent Portal QA checklist

Validate these workflows in light and dark mode:

1. Parent opens Parent Portal.
2. Parent switches between linked children.
3. Parent reviews student profile card.
4. Parent checks attendance snapshot.
5. Parent checks performance records.
6. Parent checks fee records.
7. Parent checks academic workflow assignments.
8. Missing or empty data states remain readable.
9. No unrelated student data is visible.
10. Mobile-width layout keeps all cards readable.

## Regression checks

Before merging:

```powershell
pnpm format:check
pnpm --filter @educonnect/web build
```

## Follow-up

Recommended future improvements:

- Move broad compatibility styles into explicit Library and Parent Portal page classes.
- Replace Library raw API calls with a dedicated shared API service if not already planned.
- Add parent portal API service methods in shared-api.
- Add a parent-only fee/payment detail screen.
- Add library overdue/expiry visual states and seeded QA cases.
