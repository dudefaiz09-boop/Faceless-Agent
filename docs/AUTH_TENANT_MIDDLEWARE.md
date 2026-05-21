# Auth And Tenant Middleware

Middleware order:

1. `requestContextMiddleware`
2. `enterpriseCorsMiddleware`
3. `pinoHttp`
4. `helmet`
5. `compression`
6. `express.json`
7. general rate limiter
8. public `/api`, `/api/health`, `/api/version`, `/api/ready`
9. protected router:
   `authMiddleware` -> `requireAuth` -> `tenantMiddleware` -> `idempotencyMiddleware`
10. route handlers
11. `globalErrorHandler`

Public routes:

| Route              | Auth | Tenant | Notes                                              |
| ------------------ | ---- | ------ | -------------------------------------------------- |
| `GET /api`         | No   | No     | API banner                                         |
| `GET /api/health`  | No   | No     | No Supabase/OpenRouter/document startup dependency |
| `GET /api/version` | No   | No     | No Supabase/OpenRouter/document startup dependency |
| `GET /api/ready`   | No   | No     | Validates required env presence only               |
| `OPTIONS *`        | No   | No     | CORS preflight handled before auth                 |

Tenant rules:

| User type                  | Header behavior                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Regular user               | Uses profile `schoolId`/`tenantId`; mismatched `x-school-id` returns `TENANT_MISMATCH` |
| Super admin                | Can switch only to `managedTenantIds`; unmanaged header returns `TENANT_DENIED`        |
| Missing tenant             | Returns `TENANT_REQUIRED`                                                              |
| Production tenant registry | `documents/tenants/{tenantId}` must exist and not be inactive                          |

Demo tenant IDs are valid only when `VITE_DEMO_MODE=true` in the web app. Backend tenant middleware no longer has a hardcoded `tenant-a` exception.
