# EduConnect Release Guide

This migration branch releases through Vercel for web and API hosting, with Supabase for Auth, Storage, and Postgres migrations.

## Supabase

Apply migrations from `supabase/migrations` before releasing API code that depends on new tables or policies.

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

Confirm the `educonnect-uploads` storage bucket exists before testing file uploads.

## Backend API

Deploy the API as the `educonnect-api` Vercel project from the repository root.

Use these settings:

- Framework Preset: Other
- Install Command: `corepack pnpm install --frozen-lockfile`
- Build Command: `corepack pnpm --filter @educonnect/functions build`
- Output Directory: `public`

Set:

- `NODE_ENV=production`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_UPLOADS_BUCKET`
- `CORS_ORIGINS`
- `GEMINI_API_KEY` if AI is enabled

The root `vercel.json` serves the Express app from `/api`.

## Web

Deploy the web app as the `educonnect-web` Vercel project from the repository root.
Deploy the web app as the `educonnect-web` Vercel project with `apps/web` as the root directory.

Use these settings:

- Framework Preset: Vite
- Install Command: `cd ../.. && corepack pnpm install --frozen-lockfile`
- Build Command: `cd ../.. && corepack pnpm --filter @educonnect/web build`
- Output Directory: `dist`

Set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_UPLOADS_BUCKET`
- `VITE_API_BASE_URL`
- `VITE_ENABLE_AI_FEATURES`
- `VITE_ENVIRONMENT`

Never add `SUPABASE_SERVICE_ROLE_KEY` to the web project.

## Mobile

The Android workflow builds and uploads an APK artifact to GitHub Actions. Store mobile Supabase values through your React Native env strategy before production signing.
