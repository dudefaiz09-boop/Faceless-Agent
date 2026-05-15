# EduConnect Deployment Architecture

This migration branch targets free-tier friendly hosting with Vercel and Supabase only. Deployment uses two Vercel projects from the same GitHub repository:

- `educonnect-web`
- `educonnect-api`

For the production checklist, see [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md).

## Deployable Targets

| Target | Technology | Hosting | Notes |
| --- | --- | --- | --- |
| Web | React + Vite | Vercel Hobby | Builds apps/web |
| Backend API | Node.js + Express | Vercel Hobby Functions | Served from /api |
| Database/Auth/Storage | Supabase | Supabase Free | Uses supabase/migrations/* |
| Mobile | React Native | Local / App Store / Play Store | Uses the same Supabase backend |

## Vercel Projects

### Web Project: educonnect-web

Create a Vercel project from this GitHub repository with these settings:

- Framework Preset: Vite
- Root Directory: `apps/web`
- Include source files outside Root Directory: enabled
- Install Command: `cd ../.. && corepack pnpm install --frozen-lockfile`
- Build Command: `cd ../.. && corepack pnpm --filter @educonnect/web... build`
- Output Directory: `dist`

The web project must use `apps/web` as its root so it reads [apps/web/vercel.json](./apps/web/vercel.json) instead of the API-focused root [vercel.json](./vercel.json). The `@educonnect/web...` pnpm filter is required because the web app imports internal workspace packages such as `@educonnect/shared`, whose `dist` outputs must be built before Vite bundles the app.

Set these browser-safe environment variables:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_UPLOADS_BUCKET=educonnect-uploads
VITE_API_BASE_URL=https://your-api-project.vercel.app/api
VITE_ENABLE_AI_FEATURES=true
VITE_ENVIRONMENT=production
```

Never add `SUPABASE_SERVICE_ROLE_KEY` to the web project.

### API Project: educonnect-api

Create a second Vercel project from the same GitHub repository with these settings:

- Framework Preset: Other
- Root Directory: `apps/functions`
- Include source files outside Root Directory: enabled
- Install Command: `cd ../.. && corepack pnpm install --frozen-lockfile`
- Build Command: `cd ../.. && corepack pnpm --filter @educonnect/functions build`
- Output Directory: `public`

The [apps/functions/vercel.json](./apps/functions/vercel.json) file handles the API entrypoint when `apps/functions` is the Vercel project root. The root [vercel.json](./vercel.json) is kept as a fallback for repository-root API deployments.

Set these API environment variables:

```bash
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_UPLOADS_BUCKET=educonnect-uploads
CORS_ORIGINS=https://your-web-project.vercel.app
OPENROUTER_API_KEY=your_openrouter_key_if_using_ai
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free
```

`OPENROUTER_API_KEY` is optional. Omit it if AI features are not being used. Keep it only in the API project.

## Supabase Setup

1. Create a Supabase project on the Free plan.
2. Copy the project URL.
3. Copy the anon public key.
4. Copy the service role key.
5. Copy the project ref.
6. Create a storage bucket named `educonnect-uploads`.
7. Prefer a private bucket for school and student files.
8. Apply migrations:

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

Optionally seed demo data:

```bash
pnpm seed:supabase
```

Keep `SUPABASE_SERVICE_ROLE_KEY` only in local backend `.env` files or backend hosting secrets.

## Local Development

Create `apps/web/.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_UPLOADS_BUCKET=educonnect-uploads
VITE_API_BASE_URL=/api
VITE_ENABLE_AI_FEATURES=true
VITE_ENVIRONMENT=development
```

Create `apps/functions/.env`:

```bash
NODE_ENV=development
PORT=8080
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_UPLOADS_BUCKET=educonnect-uploads
CORS_ORIGINS=http://localhost:5173
OPENROUTER_API_KEY=your_openrouter_key_if_using_ai
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free
```

## Deployment Order

1. Create Supabase project.
2. Apply migrations.
3. Create `educonnect-uploads` storage bucket.
4. Deploy API project to Vercel.
5. Test `https://your-api-project.vercel.app/api/health`.
6. Deploy web project to Vercel.
7. Set `VITE_API_BASE_URL` to the API URL.
8. Add the final web URL to `CORS_ORIGINS` in the API project.
9. Test auth, API calls, uploads, AI features, and role-based access.

## Rollback

- Web rollback: use Vercel previous deployment rollback.
- API rollback: use Vercel previous deployment rollback.
- Database rollback: export or back up Supabase data before destructive migrations.
