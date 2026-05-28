# EduConnect Deployment Architecture

This migration branch targets free-tier friendly hosting with Vercel and Supabase only. Deployment uses two Vercel projects from the same GitHub repository:

- `educonnect-web`
- `educonnect-api`

For the production checklist, see [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md).

## Deployable Targets

| Target                | Technology        | Hosting                        | Notes                               |
| --------------------- | ----------------- | ------------------------------ | ----------------------------------- |
| Web                   | React + Vite      | Vercel Hobby                   | Builds apps/web                     |
| Backend API           | Node.js + Express | Vercel Hobby Functions         | Served from /api                    |
| Database/Auth         | Supabase          | Supabase Free                  | Uses supabase/migrations/\*         |
| File Storage          | Firebase Storage  | Firebase Spark (free tier)     | New file uploads; Supabase for meta |
| Mobile                | React Native      | Local / App Store / Play Store | Uses the same Supabase backend      |

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

Set these API environment variables in your Vercel project settings for `educonnect-api`:

```bash
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_UPLOADS_BUCKET=educonnect-uploads
CORS_ORIGINS=https://your-web-project.vercel.app
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=google/gemma-3-4b-it:free
PUBLIC_APP_URL=https://your-web-project.vercel.app

# Firebase Storage (new uploads — backend only)
STORAGE_PROVIDER=firebase
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-firebase-project.appspot.com
FIREBASE_SIGNED_URL_TTL_SECONDS=900
MAX_UPLOAD_BYTES=52428800
```

**Note:** Ensure `OPENROUTER_API_KEY` is set correctly to enable live AI responses. If missing, the assistant will run in offline mode. The default model is `google/gemma-3-4b-it:free`. The system enforces strict free-model usage with automatic fallback.

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

## Firebase Storage Setup

New file uploads go to Firebase Storage. Supabase Storage is kept only for backward compatibility with existing files.

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project.
2. Enable **Firebase Storage** (Spark free plan).
3. In Project Settings → Service Accounts, click **Generate new private key**. Download the JSON file.
4. Extract `project_id`, `client_email`, and `private_key` from the JSON.
5. Add them as secrets to your `educonnect-api` Vercel project (see env vars above).
6. Set `STORAGE_PROVIDER=firebase` in the API project.
7. Deploy the API, then test by uploading a file from the web UI.
8. Confirm the file appears in Firebase Console → Storage → Files.
9. Confirm metadata appears in Supabase `documents` table with `storage_provider='firebase'`.

> **Security:** Firebase credentials are backend-only secrets. Never add them to the web project or commit them to version control.

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
OPENROUTER_MODEL=google/gemma-3-4b-it:free
```

## Deployment Order

1. Create Supabase project.
2. Apply migrations (`supabase db push`).
3. Create Firebase project and enable Storage.
4. Generate Firebase service account private key.
5. Deploy API project to Vercel with all env vars including Firebase credentials.
6. Test `https://your-api-project.vercel.app/api/health`.
7. Deploy web project to Vercel (no Firebase credentials needed).
8. Set `VITE_API_BASE_URL` to the API URL.
9. Add the final web URL to `CORS_ORIGINS` in the API project.
10. Test auth, uploads (verify file lands in Firebase Storage), downloads, and role-based access.

## Rollback

- Web rollback: use Vercel previous deployment rollback.
- API rollback: use Vercel previous deployment rollback.
- Database rollback: export or back up Supabase data before destructive migrations.
