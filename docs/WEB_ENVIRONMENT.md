# Web Environment

Required web env vars:

| Variable                       | Required | Public | Notes                                                                                          |
| ------------------------------ | -------- | ------ | ---------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`            | Yes      | Yes    | Supabase project URL                                                                           |
| `VITE_SUPABASE_ANON_KEY`       | Yes      | Yes    | Public anon/publishable key only                                                               |
| `VITE_SUPABASE_UPLOADS_BUCKET` | Yes      | Yes    | Defaults to `educonnect-uploads`                                                               |
| `VITE_API_BASE_URL`            | Yes      | Yes    | Use `/api` only for same-origin/local proxy; use absolute API URL for split Vercel deployments |
| `VITE_DEMO_MODE`               | Yes      | Yes    | `true` enables `tenant-a`/`tenant-b` demo helpers                                              |
| `VITE_ENABLE_AI_FEATURES`      | No       | Yes    | UI feature gate                                                                                |
| `VITE_ENVIRONMENT`             | No       | Yes    | `development`, `preview`, or production label                                                  |

Production rule: `VITE_API_BASE_URL` must be explicitly configured unless the build is a demo/preview. A missing or wrong value surfaces as actionable API diagnostics on module error states instead of fake empty data.
