# Phase 11 Fees Workflow Hardening Runbook

This phase improves fee management readability and import/export usability after the assignment workflow hardening phase.

## Goal

Keep fee cards, reports, CSV import, validation errors, payment states, and analytics panels readable and usable across light mode, dark mode, desktop, and mobile-width browsers.

## What changed

A fees workflow hardening stylesheet is loaded after the assignment workflow layer:

```text
apps/web/src/fees-workflow-hardening.css
```

It improves:

- Fee status chip contrast
- Payment card contrast
- CSV import textarea readability
- CSV placeholder wrapping
- Validation error panel contrast
- Chart tooltip readability in dark mode
- Mobile touch behavior for fee controls
- Fee import/export surfaces in dark mode

## QA checklist

Validate these workflows in light and dark mode:

1. Accountant opens the Fees page.
2. Accountant switches class filters.
3. Accountant downloads the sample CSV.
4. Accountant uploads/selects a CSV file.
5. Accountant pastes CSV data manually.
6. Invalid CSV shows readable validation errors.
7. Valid CSV import completes and refreshes the report.
8. Accountant exports visible fee rows.
9. Student opens the fee summary.
10. Student reviews outstanding and paid amounts.
11. Parent view, when available, shows linked child fee records only.
12. Analytics panels and chart tooltips are readable in dark mode.

## Regression checks

Before merging:

```powershell
pnpm format:check
pnpm --filter @educonnect/web build
```

## Follow-up

Recommended future improvements:

- Move broad compatibility styles into explicit Fees page classes.
- Add async import progress state for large CSV uploads.
- Add downloadable validation error CSV.
- Add parent-specific fee detail page states.
- Add e2e tests for sample CSV import/export.
