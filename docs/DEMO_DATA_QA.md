# Demo Data QA Guide

This guide explains how to validate the seeded demo data after running the Supabase seed script.

Seed script:

```text
apps/functions/scripts/seed-supabase.ts
```

## Current seed coverage

The seed script creates demo data for:

- Two demo tenants: `tenant-a` and `tenant-b`
- Tenant admins
- Principals
- Teachers
- Students
- Parents linked to students
- Librarians
- Accountants
- A global admin with access to both demo tenants
- Classes, sections, subjects, and timetable data
- Attendance records
- Assignments and submissions
- Fees
- Performance/grades
- Library resources
- Announcements
- Notifications

## Run seed locally

```powershell
cd "D:\Educonnect-Migration\EduConnect-App-supabase-migration"
pnpm --filter @educonnect/functions seed:supabase
```

Required environment variables:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Keep the service-role key server-side only. Never place it in web or mobile public env files.

## Demo QA checklist

### Global admin

- Sign in with the global demo admin from the seed script.
- Verify tenant switching between `tenant-a` and `tenant-b`.
- Confirm each tenant shows isolated users and module data.
- Verify all-users/admin views do not leak records across tenants.

### Tenant admin / principal

- Verify dashboard counts and tenant identity.
- Create or edit a user if the UI supports it.
- Check announcements, attendance, assignments, fees, performance, library, students, teachers, and audit/admin surfaces.

### Teacher

- Verify assigned classes are visible.
- Check assignments and submissions.
- Check attendance flows.
- Check performance/report visibility.
- Check chat eligibility.

### Student

- Verify own assignments, attendance, fees, library, and performance.
- Confirm the student cannot access admin-only modules.
- Confirm chat is limited to eligible school contacts.

### Parent

- Verify linked child data appears.
- Check linked child attendance, assignments, fees, and performance.
- Confirm unrelated students are not visible.

### Librarian

- Verify library module access.
- Confirm unrelated admin/fees-only actions are hidden or blocked.

### Accountant

- Verify fees module access.
- Confirm unrelated library/admin-only actions are hidden or blocked.

## Reset behavior

The seed script cleans known demo users and known demo tenant records before reseeding. It targets known demo tenant IDs and the demo email domain used by the seed script. Do not reuse those tenant IDs or demo emails for real schools.

## Recommended next improvements

After this QA pass, the next seed-data improvements should be:

- Add an explicit seed verification script that fails if required role counts are missing.
- Add a generated demo account matrix artifact for operators.
- Add sample fee import CSV output and import/export QA steps.
- Add library issue/return/expiry seed scenarios.
