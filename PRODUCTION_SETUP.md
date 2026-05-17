# Production Setup Checklist

Use this checklist after the `vercel-supabase-only-deployment` branch is merged into `main`.

## 1. Supabase

Create a Supabase project on the Free plan.

Copy these values from Supabase project settings:

- Project URL
- Anon public key
- Service role key
- Project ref

Create a storage bucket named `educonnect-uploads`. Prefer a private bucket for school and student files.

Apply migrations:

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

If you are not using the Supabase CLI, paste the SQL from `supabase/migrations/20260514000000_initial_documents.sql` into the Supabase SQL editor and run it once.

Optionally seed demo data from your local machine:

```bash
pnpm seed:supabase -- --dry-run
pnpm seed:supabase
```

Or seed from GitHub Actions:

1. Add repository secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
2. Open Actions.
3. Run `Seed Supabase Demo Data`.
4. Use `dry_run=true` first, then run again with `dry_run=false`.

If the write run fails with `permission denied for table documents`, apply the latest Supabase migrations or run this SQL once in Supabase SQL Editor:

```sql
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.documents to service_role;
grant select on public.documents to authenticated;
```

Keep `SUPABASE_SERVICE_ROLE_KEY` only in local backend `.env` files or backend hosting secrets. Never add it to the web project.

## 2. Vercel API

Create a Vercel project named `educonnect-api` from this repository.

Use these settings:

- Framework Preset: Other
- Root Directory: `apps/functions`
- Include source files outside Root Directory: enabled
- Install Command: `cd ../.. && corepack pnpm install --frozen-lockfile`
- Build Command: `cd ../.. && corepack pnpm --filter @educonnect/functions build`
- Output Directory: `public`

The `apps/functions/vercel.json` file is API-focused. It builds `@educonnect/functions`, includes `dist/**`, rewrites `/api` requests to `api/index.ts`, and publishes a tiny `public` directory so Vercel's default static output check passes.

Set these Vercel environment variables:

```bash
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_UPLOADS_BUCKET=educonnect-uploads
CORS_ORIGINS=https://your-web-project.vercel.app
OPENROUTER_API_KEY=your_openrouter_key_if_using_ai
OPENROUTER_MODEL=google/gemma-3-4b-it:free
```

`OPENROUTER_API_KEY` is optional and must stay server-side in the API project.

After deploy, verify:

```bash
curl https://your-api-project.vercel.app/api/health
```

## 3. Vercel Web

Create a second Vercel project named `educonnect-web` from the same repository.

Use these settings:

- Framework Preset: Vite
- Root Directory: `apps/web`
- Include source files outside Root Directory: enabled
- Install Command: `cd ../.. && corepack pnpm install --frozen-lockfile`
- Build Command: `cd ../.. && corepack pnpm --filter @educonnect/web... build`
- Output Directory: `dist`

The web project must use `apps/web` as the root directory so it reads `apps/web/vercel.json` instead of the API-focused root `vercel.json`. Use the `@educonnect/web...` pnpm filter so workspace package dependencies are built before Vite runs.

Set these browser-safe Vercel environment variables:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_UPLOADS_BUCKET=educonnect-uploads
VITE_API_BASE_URL=https://your-api-project.vercel.app/api
VITE_ENABLE_AI_FEATURES=true
VITE_ENVIRONMENT=production
```

Never add `SUPABASE_SERVICE_ROLE_KEY` to the web project.

The [apps/web/vercel.json](./apps/web/vercel.json) file provides the Vite build and SPA routing settings for this layout.

## 4. Final Smoke Tests

Run these checks after both production deployments are live:

```bash
curl https://your-api-project.vercel.app/api/health
curl https://your-web-project.vercel.app
```

In the browser:

- Sign in.
- Open announcements, users, teachers, students, attendance, and chat.
- Upload one file to confirm Supabase Storage policies work.
- Create one announcement and confirm it appears.
