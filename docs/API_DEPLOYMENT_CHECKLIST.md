# API Deployment & Stability Checklist

This checklist ensures that the EduConnect API remains stable and correctly handles authentication, multi-tenancy, and error states.

## 1. Backend Environment Variables (Vercel)

Ensure the following variables are set in the backend project:

- [ ] `SUPABASE_URL`: Your Supabase project URL.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin access.
- [ ] `CORS_ORIGINS`: Comma-separated list of allowed origins (e.g., `https://educonnect-web-iota.vercel.app`).
- [ ] `NODE_ENV`: Should be `production`.
- [ ] `OPENROUTER_API_KEY`: (Optional) For AI features.
- [ ] `OPENROUTER_MODEL`: (Optional) e.g., `google/gemma-3-4b-it:free`.

### Vercel Web Deployment Variables

- [ ] `VITE_API_BASE_URL`: The full URL of your deployed API (e.g., `https://educonnect-api-sigma.vercel.app/api`).

## 2. Shared API Middleware Order

Verify in `apps/functions/src/app.ts` that:

- [ ] Global security/observability middleware (Logger, CORS, Helmet) are first.
- [ ] `publicRouter` is mounted before any auth.
- [ ] `protectedRouter` applies middleware in this EXACT order:
  1. `authMiddleware` (token parser)
  2. `requireAuth` (401 if no user)
  3. `tenantMiddleware` (resolves tenant and initializes context)
- [ ] `globalErrorHandler` is the LAST middleware.

## 3. Manual Stability Verification

Test these endpoints directly in a browser or via CURL:

- [ ] `GET /api/health`: Should return 200 JSON `{ "status": "ok", ... }`.
- [ ] `GET /api/ready`: Should return 200 or 503 JSON, never a Vercel 500 crash.
- [ ] `GET /api/notifications`: Should return 401 JSON `{ "error": "Unauthorized", ... }`.
- [ ] `GET /api/announcements`: Should return 401 JSON.
- [ ] `GET /api/attendance`: Should return 401 JSON.

### Manual CORS Verification

Open DevTools Network tab and check `OPTIONS /api/notifications`:

- [ ] Status 204.
- [ ] `Access-Control-Allow-Origin` matches the web domain.
- [ ] `Access-Control-Allow-Credentials` is `true`.

## 4. Frontend Verification (Web)

- [ ] Login as `admin@educonnect.test`.
- [ ] Check Network tab: All requests to `/api/*` (except public ones) must include:
  - `Authorization: Bearer <token>`
  - `x-school-id: <tenant-id>`
- [ ] Switch schools: Verify `x-school-id` updates in subsequent requests.
- [ ] Dark Mode: Open a form and verify typed text and date pickers are readable.

## 5. Build & Test Pass

- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm test` (specifically `tests/api-stability.test.ts`)
- [ ] `pnpm turbo build --filter @educonnect/functions --filter @educonnect/web`
