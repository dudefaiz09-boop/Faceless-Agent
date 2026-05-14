# EduConnect Deployment Architecture

This migration branch targets free-tier friendly hosting without Firebase or Google Cloud deployment.

For the exact provider-dashboard checklist, see [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md).

## Deployable Targets

| Target | Technology | Hosting | Pipeline |
| :--- | :--- | :--- | :--- |
| Web | React + Vite | Cloudflare Pages | `.github/workflows/deploy-web.yml` |
| Backend API | Node.js + Express | Vercel Hobby Functions | `vercel.json` builds the bundle |
| Database/Auth/Storage | Supabase | Supabase Free | `supabase/migrations/*` |
| Mobile | React Native | Play Store / App Store | `.github/workflows/android-distribute.yml` |

## Environment Management

### Web

Use `apps/web/.env.example` as the template. Browser-safe values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_UPLOADS_BUCKET`
- `VITE_API_BASE_URL`

### Backend

Use `apps/functions/.env.example` as the template. Keep these as provider secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_UPLOADS_BUCKET`
- `GEMINI_API_KEY`

Deploy the API as a separate Vercel project using the repository root:

- Build command: `corepack pnpm --filter @educonnect/functions build`
- Function entrypoint: `api/index.ts`
- Required Vercel environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_UPLOADS_BUCKET`
- Recommended Vercel environment variable: `CORS_ORIGINS=https://your-web-app.pages.dev`
- Optional Vercel environment variables: `GEMINI_API_KEY`

After deployment, set `VITE_API_BASE_URL` in Cloudflare Pages to the Vercel deployment URL, for example:

```bash
VITE_API_BASE_URL=https://your-api-project.vercel.app/api
```

### Supabase

Apply migrations from the `supabase/migrations` folder. The first migration creates a generic document store so existing Firestore-shaped API routes can move without a big rewrite.

Seed demo users and starter documents after applying the migration:

```bash
pnpm seed:supabase
```

## CI/CD

1. CI builds and tests the monorepo on pull requests.
2. Web deploys to Cloudflare Pages on `main`.
3. The Vercel project builds the Express bundle and serves it from `/api` through Vercel's GitHub integration.

## Rollback

- Web: roll back to a previous Cloudflare Pages deployment.
- API: redeploy the previous Node bundle or container.
- Data: export Supabase `documents` rows before destructive migrations.
