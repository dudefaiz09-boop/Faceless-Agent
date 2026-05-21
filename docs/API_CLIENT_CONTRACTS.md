# API Client Contracts

Shared API client behavior:

- Builds URLs safely whether base URL is `/api` or `https://host/api`.
- Injects `Authorization` from Supabase access token.
- Injects `x-school-id` from the selected tenant.
- Injects `x-correlation-id` for every request.
- Retries only safe `GET`/`HEAD` reads.
- Maps network, auth, tenant, validation, and server failures into `ApiRequestError`.

Shared services now exist for:

- announcements
- assignments
- attendance
- chat/AI
- fees
- library
- notifications
- parent portal
- performance
- roles
- students
- teachers
- users
