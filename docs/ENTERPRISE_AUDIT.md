# Enterprise Audit

EduConnect is structurally close to the target SaaS shape, but the inspected code still mixed demo assumptions, document-store compatibility patterns, raw endpoint strings, and inconsistent error responses.

Major risks found:

- Backend auth errors could be swallowed and then converted to generic unauthorized responses.
- Tenant middleware allowed a hardcoded `tenant-a` super-admin exception.
- `getSupabase()` could fall back to the service-role key.
- Document compatibility queries fetched tenant collections and filtered JSON in memory.
- Web production could silently use `/api` or demo tenant defaults.
- Many module pages still call raw endpoints directly.
- Idempotency, durable audit logging, and route-specific permissions are incomplete across legacy routes.

Fixes applied in this pass:

- Structured enterprise errors with stable codes and correlation IDs.
- Request context middleware with AsyncLocalStorage.
- CORS middleware consolidated and hardened.
- Auth and tenant middleware hardened.
- Supabase helper fallback removed.
- Document query pushdown/default limits plus indexes.
- Shared API services expanded.
- Demo mode made explicit.
- Fees and Users pages moved to shared services for critical writes.
- CI now runs shared, shared-api, shared-education, functions, and web builds.
