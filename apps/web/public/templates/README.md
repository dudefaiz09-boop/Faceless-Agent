# Public import templates

This folder stores downloadable templates that can be served by the web app.

## Fees import CSV

File: `fees-import-sample.csv`

Required columns:

```csv
studentId,amountDue,dueDate,status,amountPaid
```

Supported status values:

- `pending`
- `partial`
- `paid`

Rules:

- `studentId` must match an existing learner account in the active tenant.
- `amountDue` and `amountPaid` must be numeric values.
- `dueDate` should use `YYYY-MM-DD` format.
- Use `amountPaid` as `0` for unpaid rows.
