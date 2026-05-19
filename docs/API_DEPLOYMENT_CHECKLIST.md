# API Deployment & Stability Checklist

This checklist keeps the EduConnect API stable on Vercel and separates startup/import failures from browser CORS symptoms.

## API Vercel Project Settings

- Framework Preset: Other
- Root Directory: repo root / empty
- Git Branch: main
- Runtime entrypoint: `api/index.ts`
- Serverless import: `api/index.ts` must import `../apps/functions/src/app`, not any `dist/**` file.

## API Environment

Set these variables on the API Vercel project:

- `SUPABASE_URL=<project URL>`
- `SUPABASE_SERVICE_ROLE_KEY=<service role key>`
- `CORS_ORIGINS=https://educonnect-web-iota.vercel.app`
- `NODE_ENV=production`
- `OPENROUTER_API_KEY` optional
- `OPENROUTER_MODEL` optional/free only

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the web project.

## Web Environment

Set this variable on the web Vercel project:

- `VITE_API_BASE_URL=https://educonnect-api-sigma.vercel.app/api`

## Serverless Startup Rules

- `api/index.ts` imports the Express app source directly.
- `api/index.ts` must never import `apps/functions/src/index.ts`; that file starts `app.listen()` for local server usage.
- Vercel runtime must not depend on `apps/functions/dist/app.js` or `apps/functions/dist/index.js`.
- Public diagnostic routes must not require Supabase, OpenRouter, auth, tenant context, or the document layer during import.

If `/api/version` crashes, do not debug CORS first. Fix API startup/import/deployment first.

## Middleware Order

Verify in `apps/functions/src/app.ts`:

- Global CORS/preflight handling runs before auth, tenant middleware, protected routers, and rate limiters.
- `OPTIONS` requests return `204`.
- `publicRouter` is mounted before any protected router.
- `protectedRouter` applies middleware in this order:
  1. `authMiddleware`
  2. `requireAuth`
  3. `tenantMiddleware`
- `globalErrorHandler` is the final middleware.

## Post-Deploy Checks

1. `https://educonnect-api-sigma.vercel.app/api/version`
   Expected: JSON 200.

2. `https://educonnect-api-sigma.vercel.app/api/health`
   Expected: JSON 200.

3. `https://educonnect-api-sigma.vercel.app/api/ready`
   Expected: JSON 200 if envs and Supabase connectivity are good, JSON 503 if envs are missing or Supabase is unreachable. Never a Vercel crash page.

4. `https://educonnect-api-sigma.vercel.app/api/notifications`
   Expected without login: JSON 401. Never a Vercel crash page.

## PowerShell CORS Check

```powershell
curl.exe -i -X OPTIONS "https://educonnect-api-sigma.vercel.app/api/notifications" `
  -H "Origin: https://educonnect-web-iota.vercel.app" `
  -H "Access-Control-Request-Method: GET" `
  -H "Access-Control-Request-Headers: authorization,x-school-id,content-type"
```

Expected:

```txt
HTTP 204
access-control-allow-origin: https://educonnect-web-iota.vercel.app
access-control-allow-credentials: true
```

## Protected Route Expectations

Without `Authorization`, these routes must return JSON 401:

- `GET /api/notifications`
- `GET /api/announcements`
- `GET /api/attendance`
- `GET /api/assignments`
- `GET /api/library`
- `GET /api/fees`
- `GET /api/performance`
- `GET /api/teachers`
- `GET /api/chat`
- `GET /api/users`
- `GET /api/students`

With auth but missing tenant context, protected routes should return JSON 400 `Tenant Context Required`.

With an invalid tenant override, protected routes should return JSON 403 `Tenant Access Denied`.

## Build & Test Pass

- `pnpm format:check`
- `pnpm lint`
- `pnpm test`
- `pnpm turbo build --filter @educonnect/functions`
- `pnpm turbo build --filter @educonnect/web`
