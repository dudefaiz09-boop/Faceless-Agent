# Error Format

All API errors should return JSON:

```json
{
  "status": "error",
  "code": "SOME_CODE",
  "message": "Safe user-facing message",
  "details": {},
  "correlationId": "request-correlation-id"
}
```

Core codes:

| Code                   |    HTTP | Meaning                                          |
| ---------------------- | ------: | ------------------------------------------------ |
| `AUTH_MISSING`         |     401 | Missing bearer token on a protected route        |
| `AUTH_INVALID`         |     401 | Token verification failed                        |
| `AUTH_EXPIRED`         |     401 | Token is expired                                 |
| `AUTH_PROFILE_MISSING` |     401 | Auth user exists but profile/claims are missing  |
| `USER_INACTIVE`        |     403 | User profile is inactive                         |
| `TENANT_REQUIRED`      |     400 | No tenant can be resolved                        |
| `TENANT_DENIED`        |     403 | Super-admin requested an unmanaged tenant        |
| `TENANT_MISMATCH`      |     403 | User attempted to override their assigned tenant |
| `TENANT_NOT_FOUND`     |     403 | Tenant record does not exist                     |
| `TENANT_INACTIVE`      |     403 | Tenant record is inactive                        |
| `PERMISSION_DENIED`    |     403 | Missing role/module/permission                   |
| `VALIDATION_ERROR`     |     400 | Zod validation failed                            |
| `INVALID_JSON`         |     400 | Request body is not valid JSON                   |
| `RATE_LIMITED`         |     429 | Route limit exceeded                             |
| `SUPABASE_TIMEOUT`     |     504 | Supabase request timed out                       |
| `SUPABASE_ERROR`       | 4xx/5xx | Supabase returned an operational error           |
| `CONFIG_MISSING`       |     503 | Required backend config is missing               |
| `CORS_ORIGIN_DENIED`   |     403 | Preflight origin is not allowed                  |
| `API_STARTUP_FAILED`   |     503 | Serverless entrypoint could not load the app     |
