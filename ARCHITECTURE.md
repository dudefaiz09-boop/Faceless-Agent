\# EduConnect Full-Stack Architecture



\## Apps



\- `apps/web`: React/Vite web dashboard.

\- `apps/mobile`: React Native Android/iOS app.

\- `apps/functions`: Express backend API.

\- `apps/admin-console`: Admin console.

\- `packages/\*`: Shared types, API contracts, logging, analytics, notifications, and education domain logic.



\## Backend Infrastructure



Supabase provides:

\- Database

\- Auth

\- Storage

\- Row Level Security

\- Tenant-scoped records



\## Request Flow



Web/Mobile → `@educonnect/shared-api` → `apps/functions` API → Supabase



Direct Supabase client access is allowed only for safe user-level operations protected by RLS.



Sensitive actions must go through `apps/functions`.



\## Sensitive API Actions



Use backend API for:

\- User creation/deletion

\- Role changes

\- Tenant switching

\- Imports/exports

\- Fee operations

\- Performance imports

\- Library issue/return

\- Audit logs

\- Notifications

\- AI assistant context

\- Any service-role-key operation



\## Security Rules



\- Service role key only exists in `apps/functions`.

\- Web/mobile only use anon/publishable Supabase keys.

\- All protected API routes require authentication.

\- All protected API routes require tenant context.

\- Sensitive routes require role checks.

\- Tenant data must never leak across schools.

