# Idempotency

The backend accepts `x-idempotency-key` for protected `POST`, `PUT`, and `PATCH` requests. The key is scoped by tenant, user, method, and route.

Current covered clients:

- fees upload
- fee payment
- user creation
- user bulk import
- attendance/performance/shared services where keys are provided

The current implementation uses a short-lived process-local cache. For multi-region production, replace it with a durable table or Redis keyed by tenant/user/route/key and persist the response body/status.
