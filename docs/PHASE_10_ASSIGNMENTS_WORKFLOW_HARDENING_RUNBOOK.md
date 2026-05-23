# Phase 10 Assignments Workflow Hardening Runbook

This phase improves assignment workflow readability and resilience after the broader web UX hardening phases.

## Goal

Keep assignment cards, empty/error states, submission panels, and grading controls readable in dark mode while preserving the existing assignment workflow behavior.

## What changed

A scoped compatibility stylesheet is loaded after the global web UX hardening layer:

```text
apps/web/src/assignment-workflow-hardening.css
```

It targets assignment surfaces only through:

```text
[data-edu-surface='assignments']
```

The hardening layer improves:

- Assignment sync/status panel contrast
- Student submission cards
- Teacher grading panels
- AI draft analysis panels
- Submission status chips
- Assignment detail panel shadows and borders
- Form control sizing in assignment workflows
- Long submission text wrapping

## QA checklist

Validate these workflows in light and dark mode:

1. Teacher opens Assignments.
2. Teacher switches classes.
3. Empty assignment classes show an empty state.
4. API errors show the retry state without crashing the page.
5. Teacher creates an assignment.
6. Student views assignment list.
7. Student submits written work.
8. Student attaches a file when available.
9. Teacher opens submissions.
10. Teacher reviews AI draft feedback.
11. Teacher publishes final feedback.
12. Student sees final teacher feedback.

## Regression checks

Before merging:

```powershell
pnpm format:check
pnpm --filter @educonnect/web build
```

## Follow-up

This compatibility stylesheet is intentionally scoped. Future assignment work should move the remaining visual logic into explicit component classes inside:

```text
apps/web/src/pages/Assignments.tsx
```

Recommended next improvements:

- Add clearer due-date state chips.
- Add teacher rubric fields.
- Add submission upload progress state.
- Add parent read-only assignment detail view.
- Add downloadable sample assignment attachment flow for demo data.
