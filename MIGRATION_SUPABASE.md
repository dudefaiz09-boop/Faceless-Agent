# Firebase to Supabase/Cloudflare Migration

This duplicate repo is the migration workspace for moving EduConnect away from Google Cloud/Firebase while keeping the app inside free-tier friendly services.

## Target Stack

- Web hosting: Cloudflare Pages
- Auth: Supabase Auth
- Database: Supabase Postgres with a generic `documents` table during migration
- File uploads: Supabase Storage bucket `educonnect-uploads`
- API: existing Express app as a standalone Node service
- AI: optional Gemini API key, disabled by omission

## What Is Migrated In This Slice

- Firebase Functions wrapper removed from the API entrypoint.
- Backend Auth now verifies Supabase access tokens.
- Backend user creation/deletion now uses Supabase Auth Admin.
- Backend Firestore calls are routed through a Supabase-backed compatibility adapter.
- Web login/logout and API bearer tokens now use Supabase Auth.
- Mobile login/logout and API bearer tokens now use Supabase Auth.
- Web file uploads now use Supabase Storage.
- Web user, staff, student, attendance, chat, and announcement screens no longer import Firebase.
- The unused `packages/shared-firestore` workspace has been removed.
- Cloudflare Pages headers and SPA redirects are added.
- Supabase migrations create `documents`, enable Realtime for it, and create the upload bucket.

## Remaining Migration Work

- Replace Firebase mobile native packages after the mobile screens no longer import Firestore.
- Choose the final free Node runtime for the Express API, or rewrite API modules as Supabase Edge Functions.
- Replace FCM assignment push notifications with Expo Push, Web Push, or another free-tier provider.
- Export existing Firestore data and import it into `public.documents`.

## Local Setup

1. Create a Supabase project.
2. Run the SQL in `supabase/migrations/20260514000000_initial_documents.sql`.
3. Copy `.env.example` values into app-specific `.env` files.
4. Start the API:

```bash
pnpm --filter @educonnect/functions build
node apps/functions/dist/standalone.js
```

5. Start the web app:

```bash
pnpm --filter @educonnect/web dev
```

## Data Import Shape

Each former Firestore document maps to:

```json
{
  "collection": "announcements",
  "id": "existing-document-id",
  "data": {
    "tenantId": "default-school",
    "title": "Welcome",
    "createdAt": "2026-05-14T00:00:00.000Z"
  }
}
```

This keeps the first migration small. Once the app is stable on Supabase, convert high-traffic collections to normalized Postgres tables.
