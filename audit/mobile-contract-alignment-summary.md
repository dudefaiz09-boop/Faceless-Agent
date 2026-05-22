# Mobile Contract Alignment Summary

## Status

Mobile app screens and bootstrap flows have been routed through shared API services instead of direct document reads or raw API calls.

## Completed cleanup

- `AssignmentsScreen.tsx`, `HomeScreens.tsx`, `OperationalScreens.tsx`, and `ChatScreen.tsx` now use shared service clients instead of raw `apiClient.request`, `useDocuments`, or direct document helpers.
- `apps/mobile/src/lib/documents.ts` was removed after mobile screens stopped importing it.
- `AuthContext.tsx` now loads profile bootstrap data through `authProfileService.getProfile()` instead of querying the `documents` table directly.
- `packages/shared-api` now includes service contracts for chat and auth profile bootstrap.
- Backend exposes `/api/auth/profile` for authenticated profile bootstrap before tenant-scoped routes require a selected school.

## Verification searches

The following high-risk patterns should return no app-layer hits under `apps/mobile/src` and `apps/web/src`:

```text
apiClient.request
fetch(
axios
supabase.from
supabase.storage
useDocuments
listDocuments
```

The following pattern should also return no app-layer hits outside shared API clients:

```text
/api/
```

## Intentional exceptions

- Supabase Auth calls in mobile/web auth flows remain intentional because Supabase is the authentication provider.
- Backend server routes and middleware may continue using server-side data access through trusted service/admin helpers.
- Shared API service files intentionally contain endpoint paths because they are the contract boundary.

## Next recommended phase

Run local verification before further feature work:

```powershell
pnpm --filter mobile lint
pnpm --filter mobile test
pnpm --filter @educonnect/functions build
pnpm --filter @educonnect/web build
pnpm format:check
```

Then continue with sales-demo/data QA or backend route modularization, not more mobile raw-access cleanup, unless a fresh audit reveals new regressions.
