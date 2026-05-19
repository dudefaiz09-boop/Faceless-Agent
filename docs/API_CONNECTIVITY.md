# API Connectivity

The web app resolves API calls from `VITE_API_BASE_URL`.

- Same deployment: leave `VITE_API_BASE_URL` unset and the client uses `/api`.
- Separate API deployment: set `VITE_API_BASE_URL` to the deployed functions URL, including `/api` only if that deployment expects it.
- Health check: `GET /api/health`.
- Readiness check: `GET /api/ready`.

Protected requests must include:

- `Authorization: Bearer <supabase access token>`
- `x-school-id: <active tenant id>`

The API client logs safe diagnostics in development only: base URL, endpoint, selected tenant ID, and whether a token exists. It never logs access tokens.

CORS is controlled by `CORS_ORIGINS`; localhost, `127.0.0.1`, and `*.vercel.app` preview domains are allowed by default.
