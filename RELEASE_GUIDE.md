# EduConnect Release Guide

This migration branch releases through Cloudflare Pages for web assets and Supabase for Auth, Storage, and Postgres migrations.

## Web

1. Add these GitHub secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL`
2. Push to `main`.
3. The `Deploy Web to Cloudflare Pages` workflow builds `apps/web` and deploys `apps/web/dist`.

## Supabase

Apply migrations from `supabase/migrations` before releasing API code that depends on new tables or policies.

```bash
supabase db push
```

## Backend API

The API currently builds as a standalone Node bundle:

```bash
pnpm --filter @educonnect/functions build
node apps/functions/dist/standalone.js
```

Deploy that bundle to the free Node runtime you choose and set:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_UPLOADS_BUCKET`
- `GEMINI_API_KEY` if AI is enabled

## Mobile

The Android workflow builds and uploads an APK artifact to GitHub Actions. Store mobile Supabase values through your React Native env strategy before production signing.
