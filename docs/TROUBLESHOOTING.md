# Troubleshooting

| Symptom                    | Check                                                                      |
| -------------------------- | -------------------------------------------------------------------------- |
| API server unreachable     | Verify `VITE_API_BASE_URL` or `API_BASE_URL`; run `/api/health`            |
| Unauthorized               | Confirm Supabase session exists and Authorization header is sent           |
| Tenant Context Required    | Confirm profile has `schoolId`/`tenantId` or allowed tenant switcher value |
| Tenant Access Denied       | Confirm `x-school-id` matches profile or super-admin `managedTenantIds`    |
| CORS preflight failed      | Confirm origin is in `CORS_ORIGINS`; inspect `CORS_ORIGIN_DENIED`          |
| User inactive              | Reactivate profile/status in admin flow                                    |
| Missing permission         | Compare user role/permissions with `docs/PERMISSION_MATRIX.md`             |
| Blank screen after refresh | Check web env validation and browser console for module load errors        |
| Dark mode unreadable text  | Use dark-mode smoke tests and shared UI tokens                             |
| Import failures            | Validate CSV row-level errors; use idempotency key for retries             |
| Role/module not visible    | Check `assignedModules`, role, and backend permission checks               |
