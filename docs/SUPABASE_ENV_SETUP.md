# Supabase Env Setup

Backend required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` for backend anon helper paths
- `SUPABASE_UPLOADS_BUCKET`
- `CORS_ORIGINS`

Frontend/mobile required:

- `VITE_SUPABASE_URL` / `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` / `API_BASE_URL`

Never expose `SUPABASE_SERVICE_ROLE_KEY` to web or mobile. Use service role only in `apps/functions`.
