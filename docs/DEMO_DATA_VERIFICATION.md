# Demo Data Verification

Run the seed script:

```bash
pnpm seed:supabase
```

Dry run:

```bash
pnpm --filter @educonnect/functions exec tsx scripts/seed-supabase.ts --dry-run
```

The seed prints a verification summary for:

- tenants
- profiles/users
- attendance
- assignments/submissions
- fees
- performance/grades
- library
- announcements
- notifications

Seed IDs for visible fee and performance documents are deterministic, so rerunning the seed should update records instead of duplicating them in the app.
