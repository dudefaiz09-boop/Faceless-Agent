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

## User import CSV

File: `user-import-sample.csv`

Required columns:

```csv
email,role,password,permissions,classId,classIds,linkedStudentIds,tenantId,displayName
```

Supported role examples:

- `student`
- `teacher`
- `parent`
- `admin`
- `principal`
- `librarian`
- `accountant`
- `staff`

Rules:

- `email`, `role`, `password`, and `displayName` are required for new users.
- `tenantId` should match the active tenant or an allowed managed tenant.
- Use comma-separated values inside quoted cells for multi-value fields such as `permissions`, `classIds`, and `linkedStudentIds`.
- Parent rows should use `linkedStudentIds` to connect children.
- Teacher rows should use `classId` or `classIds` for assigned classes.
