# Demo Data Overview

## Tenants

| ID       | Name                            | Slug                            | City   | Board |
| -------- | ------------------------------- | ------------------------------- | ------ | ----- |
| tenant-a | EduConnect Demo Academy         | educonnect-demo-academy         | Pune   | CBSE  |
| tenant-b | EduConnect International School | educonnect-international-school | Mumbai | ICSE  |

Run the Supabase demo seed with:

```bash
pnpm seed:supabase
```

The seed script first removes only known demo records for `tenant-a`, `tenant-b`, stale
`tenant-c`, `@educonnect.test` auth users, and explicitly listed stale test identities such as
`test@test.com`, `Student Demo`, `Student A`, `Student B`, and `TEST`. It does not delete unknown
tenants or real user domains. All seeded accounts use the local/demo-only password `Test@123456`.

## Seeded Modules

### 1. Attendance

- 7 days of historical data for all students in both demo tenants.
- Mixed statuses: Present, Absent, Late.

### 2. Assignments & Submissions

- **School A:** Algebra Practice (Math), Reading Reflection (English).
- **School B:** CS Basics Quiz (Computer Science).
- Submissions seeded for all students with grades and feedback.

### 3. Fees

- Tuition Fees and Library Fees seeded for all students.
- Mixed payment statuses: Paid, Pending.

### 4. Users

- User accounts across admin, principal, teacher, student, parent, librarian, and accountant roles
  for each tenant, plus a global demo admin.
- Role-based permissions and module access.
- Multi-tenant memberships for the super admin.

## AI Assistant Scenarios

- **Student:** "Was I present yesterday?", "Show my pending assignments."
- **Parent:** "How is my child doing in Math?", "Show my children's fee balances."
- **Teacher:** "Which students in my class are absent today?", "Summarize submissions for Algebra Practice."
- **Principal:** "Give me a school-wide attendance summary.", "Show fee collection status."
- **Admin:** Switch between schools and ask tenant-scoped questions.

## Test Accounts

| Tenant   | Role        | Email                              |
| -------- | ----------- | ---------------------------------- |
| tenant-a | Admin       | admin.demo1@educonnect.test        |
| tenant-a | Principal   | principal.demo1@educonnect.test    |
| tenant-a | Teacher     | teacher.math.demo1@educonnect.test |
| tenant-a | Student     | student.a.demo1@educonnect.test    |
| tenant-a | Parent      | parent.a.demo1@educonnect.test     |
| tenant-a | Librarian   | librarian.demo1@educonnect.test    |
| tenant-a | Accountant  | accountant.demo1@educonnect.test   |
| tenant-b | Admin       | admin.demo2@educonnect.test        |
| tenant-b | Principal   | principal.demo2@educonnect.test    |
| tenant-b | Teacher     | teacher.math.demo2@educonnect.test |
| tenant-b | Student     | student.a.demo2@educonnect.test    |
| tenant-b | Parent      | parent.a.demo2@educonnect.test     |
| tenant-b | Librarian   | librarian.demo2@educonnect.test    |
| tenant-b | Accountant  | accountant.demo2@educonnect.test   |
| global   | Super admin | admin@educonnect.test              |
