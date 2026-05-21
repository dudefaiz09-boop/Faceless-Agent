# Backend Connections

Runtime entrypoints:

| Entrypoint                    | Behavior                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `api/index.ts`                | Root Vercel handler, imports `apps/functions/src/app.ts`, never starts `app.listen()`   |
| `apps/functions/api/index.ts` | Functions-project Vercel handler, imports `../dist/app.js`, never starts `app.listen()` |
| `apps/functions/src/app.ts`   | Express app factory/export                                                              |
| `apps/functions/src/index.ts` | Local Node server only; calls `app.listen()`                                            |

Supabase:

- `getSupabaseAdmin()` uses `SUPABASE_SERVICE_ROLE_KEY` and is backend-only.
- `getSupabase()` now requires `SUPABASE_ANON_KEY`; it no longer falls back to the service role key.
- `withSupabaseRetry()` provides bounded retry/timeout for safe transient operations.
- `/api/ready` validates env presence and does not force document-layer startup.

Document compatibility layer:

- Tenant scoping is always applied.
- Default list limit is capped at 500 unless a route uses `.limit()`.
- Simple JSONB equality, `in`, and array-contains filters are pushed down to Supabase.
- New migration `20260522000000_enterprise_document_indexes.sql` adds high-traffic indexes.
