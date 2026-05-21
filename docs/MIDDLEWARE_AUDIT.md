# Middleware Audit

Completed:

- Single enterprise CORS middleware with strict headers.
- OPTIONS preflight handled before auth.
- Correlation IDs generated/accepted and emitted in headers/errors.
- `AsyncLocalStorage` stores request, user, and tenant context.
- Auth failures return stable error codes.
- Tenant middleware removed hardcoded `tenant-a` exception.
- Global error handler normalizes AppError, Zod, JSON, Supabase, and unexpected errors.
- Rate limiting returns structured JSON.
- Idempotency middleware added for protected write routes.

Remaining:

- Move rate-limit and idempotency storage to durable shared infrastructure.
- Wire new permission middleware through every legacy route.
- Add durable audit-log middleware around every sensitive action; user management already writes audit logs in its service layer.
