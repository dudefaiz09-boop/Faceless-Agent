# EduConnect Supabase Security Notes

The initial migration uses `public.documents` as a Firestore-compatible bridge.

## Current Policies

- Service role can manage all documents.
- Authenticated users can read their own profile document.
- Authenticated users can read documents whose `tenantId` or `schoolId` matches the school id in their Supabase metadata.
- Authenticated users can upload files to the `educonnect-uploads` bucket.
- Uploads are public-read for simple assignment/file sharing during the migration.

## Hardening Tasks

- Move high-traffic collections into normalized tables with explicit RLS policies.
- Restrict upload paths by `auth.uid()` or `schoolId`.
- Replace client-side Firestore realtime screens with Supabase Realtime channels scoped by tenant.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
