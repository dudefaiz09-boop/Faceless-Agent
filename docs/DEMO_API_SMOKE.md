# Seeded demo API smoke tests

Run the backend/API smoke tests after the demo seed has been applied and the API is reachable.

```bash
DEMO_API_SMOKE_BASE_URL=http://localhost:3000 \
SUPABASE_URL=... \
SUPABASE_ANON_KEY=... \
pnpm demo:api-smoke
```

Optional variables:

- `DEMO_API_SMOKE_PASSWORD` overrides the default demo password, `Test@123456`.
- `API_BASE_URL` or `NEXT_PUBLIC_API_URL` can be used instead of `DEMO_API_SMOKE_BASE_URL`.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or `VITE_SUPABASE_ANON_KEY` can be used for CI environments that already expose public Supabase client settings.

The command signs in with seeded demo users through Supabase Auth, calls the real protected API endpoints, scopes every request with `x-school-id`, and prints one PASS/FAIL line per tenant, role, and module. Secret values are only read from environment variables and are not printed.

## Sample output

```text
Running seeded demo API smoke tests...
PASS tenant-a admin auth/profile: role=admin tenant=tenant-a
PASS tenant-a admin announcements: count > 0 (got 3)
PASS tenant-a admin assignments: count > 0 (got 2)
PASS tenant-a admin library resources: count > 0 (got 4)
PASS tenant-a admin attendance: count > 0 (got 7)
PASS tenant-a admin performance report: count > 0 (got 4)
PASS tenant-a admin fees report: count > 0 (got 4)
PASS tenant-a admin users: count > 0 (got 8)
PASS tenant-a teacher auth/profile: role=teacher tenant=tenant-a
PASS tenant-a teacher assignments: count > 0 (got 2)
PASS tenant-a student auth/profile: role=student tenant=tenant-a
PASS tenant-a student assignments: count > 0 (got 2)
PASS tenant-a student attendance history: count > 0 (got 7)
PASS tenant-a student fees account: count > 0 (got 2)
PASS tenant-a student performance records: count > 0 (got 2)
PASS tenant-a parent parent portal: linked student 00000000-0000-4000-8000-000000000000
PASS tenant-a parent parent fees: count > 0 (got 2)
PASS tenant-a librarian library resources: count > 0 (got 4)
PASS tenant-a accountant fees report: count > 0 (got 4)
PASS tenant-a principal users: count > 0 (got 8)
PASS tenant-b admin auth/profile: role=admin tenant=tenant-b
PASS tenant-b student assignments: count > 0 (got 2)
PASS tenant-b librarian library resources: count > 0 (got 4)
PASS tenant-b accountant fees report: count > 0 (got 4)
Demo API smoke complete: 84/84 checks passed.
```

Failure lines include the tenant, role, endpoint/module, and reason, for example:

```text
FAIL tenant-b librarian library resources: expected > 0, got 0
```
