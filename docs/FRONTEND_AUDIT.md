# Frontend Audit

Completed:

- `VITE_DEMO_MODE` separates demo tenants/classes from production tenant resolution.
- Production no longer silently defaults web users to `tenant-a`.
- Shared services added for the major modules and exported from web/mobile API clients.
- API client has correlation IDs, safe retries, timeout errors, tenant error mapping, and diagnostics.
- Fees page now uses `FeesService` for report, account, upload, and payment flows.
- All Users page now uses `UsersService` for create/update/deactivate/bulk import and avoids demo tenant sample IDs unless demo mode is enabled.
- Added reusable `ModuleState` and `ConfirmDialog`.
- Modal closes on Escape.
- App has a 404 route and broader module error boundary coverage.

Remaining:

- Replace all remaining raw `apiClient.request` calls in pages and mobile screens with the new shared services.
- Replace demo class selectors with backend class APIs in production.
- Add RTL/MSW tests for AuthContext, module state variants, fees import, and users modal behavior.
- Add visual dark-mode regression tests for every page.
