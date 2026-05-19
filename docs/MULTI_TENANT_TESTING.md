# Multi-Tenant Testing Guide

## 1. Global Admin Tenant Switching

1. Login as `admin@educonnect.test` / `Test@123456`.
2. Observe the **School Switcher** in the Page Header.
3. Switch to **School B**.
4. Verify that only students and data from School B are visible in the modules.
5. Switch back to **School A** and verify the lists change again.

## 2. Role-Based Tenant Isolation

1. Login as `principal.b@educonnect.test` / `Test@123456`.
2. Confirm that the **School Switcher** is **not visible**.
3. Verify that only School B data is accessible.
4. Attempt to manually set `educonnect_school_id` to `tenant-a` in LocalStorage and refresh.
5. Confirm that the backend rejects access or forces context back to `tenant-b`.

## 3. Parent Portal (Multi-Child AI)

1. Login as `parent.a@educonnect.test` / `Test@123456`.
2. Open the **AI Assistant**.
3. Ask: "Show my children's recent attendance and fees."
4. Verify the AI aggregates data for both `student.a` and `student.b`.

## 4. Bulk Import

1. Login as `admin@educonnect.test`.
2. Go to **Users** module -> **Bulk Import**.
3. Download the template and add a few test rows.
4. Select **School B** as the target.
5. Execute import and verify the new users appear in School B's list.

## 5. AI Assistant Role Contexts

- **Teacher:** Ask about class performance.
- **Student:** Ask about own grades.
- **Accountant:** Ask about fee collection (School B).
- **Librarian:** Ask about book availability (School A).
