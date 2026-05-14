# Production Setup Checklist

Use this checklist after the `codex-supabase-migration` branch is merged into `main`.

## 1. Supabase

Create a Supabase project on the Free plan, then run:

```bash
supabase db push
```

If you are not using the Supabase CLI, paste the SQL from `supabase/migrations/20260514000000_initial_documents.sql` into the Supabase SQL editor and run it once.

Copy these values from Supabase project settings:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Upload bucket name: `educonnect-uploads`

Then seed demo data from your local machine:

```bash
pnpm seed:supabase -- --dry-run
pnpm seed:supabase
```

The seed creates demo users and starter school data. Keep `SUPABASE_SERVICE_ROLE_KEY` only in local `.env` files or backend hosting secrets.

## 2. Vercel API

Create a new Vercel project from this repository.

Use these settings:

- Root directory: repository root
- Framework preset: Other
- Install command: `corepack pnpm install --frozen-lockfile`
- Build command: `corepack pnpm --filter @educonnect/functions build`
- Output directory: leave empty

Set these Vercel environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_UPLOADS_BUCKET=educonnect-uploads`
- `CORS_ORIGINS=https://your-cloudflare-pages-domain.pages.dev`
- Optional: `GEMINI_API_KEY`

After deploy, verify:

```bash
curl https://your-vercel-project.vercel.app/api/health
```

Expected response:

```json
{"status":"healthy"}
```

## 3. Cloudflare Pages Web

Create a Cloudflare Pages project from this repository.

Use these settings:

- Build command: `corepack pnpm --filter @educonnect/web build`
- Build output directory: `apps/web/dist`
- Root directory: repository root

Set these Cloudflare Pages environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_UPLOADS_BUCKET=educonnect-uploads`
- `VITE_API_BASE_URL=https://your-vercel-project.vercel.app/api`

After deploy, open the Cloudflare Pages URL and confirm login works with a seeded demo user.

## 4. GitHub Secrets

Add these repository secrets if you want GitHub Actions to deploy the web app to Cloudflare Pages:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`

The Vercel project deploys through Vercel's GitHub integration, so the API does not need a GitHub deploy secret.

## 5. Final Smoke Test

Run these checks after both production deployments are live:

```bash
curl https://your-vercel-project.vercel.app/api/health
curl https://your-cloudflare-pages-domain.pages.dev
```

In the browser:

- Sign in.
- Open announcements, users, teachers, students, attendance, and chat.
- Upload one file to confirm Supabase Storage policies are working.
- Create one announcement and confirm it appears without refreshing.

## Notes About ChatGPT Plus

ChatGPT Plus helps with access to ChatGPT and Codex features, but it does not include application hosting. The free-hosting plan here still uses Supabase Free, Vercel Hobby, and Cloudflare Pages.
