# EduConnect Deployment Architecture

This migration branch targets free-tier friendly hosting without Firebase or Google Cloud deployment.

## Deployable Targets

| Target | Technology | Hosting | Pipeline |
| :--- | :--- | :--- | :--- |
| Web | React + Vite | Cloudflare Pages | `.github/workflows/deploy-web.yml` |
| Backend API | Node.js + Express | Free Node runtime of choice | `.github/workflows/deploy-functions.yml` builds the bundle |
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
- `GEMINI_API_KEY`

### Supabase

Apply migrations from the `supabase/migrations` folder. The first migration creates a generic document store so existing Firestore-shaped API routes can move without a big rewrite.

## CI/CD

1. CI builds and tests the monorepo on pull requests.
2. Web deploys to Cloudflare Pages on `main`.
3. API workflow builds the standalone Express bundle. Deploy the built API to the free Node provider you choose.

## Rollback

- Web: roll back to a previous Cloudflare Pages deployment.
- API: redeploy the previous Node bundle or container.
- Data: export Supabase `documents` rows before destructive migrations.
