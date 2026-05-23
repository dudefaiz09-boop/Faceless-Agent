# Phase 22: Full-Stack Web and Mobile Roadmap

## Current direction

EduConnect is moving toward a production-grade full-stack school platform with:

- Web app for administrators, staff, teachers, students, and parents
- Mobile app for parent and student daily workflows
- Shared API contracts and service boundaries
- Supabase-backed multi-tenant data model
- CI checks for formatting, linting, tests, shared package builds, functions, web, and mobile

## Recent stabilization already completed

- Shared API usage was enforced for selected web pages.
- CI now runs the web shared API boundary audit.
- Library overdue states and librarian permissions were hardened.
- Fees CSV sample templates and import documentation were added.
- Demo readiness and release-note documents were added.

## Remaining phases to reach full-stack readiness

### Phase A: Product QA and bug burn-down

Goal: verify that existing modules work end to end before adding more features.

Recommended checks:

- Authentication and tenant context
- Dashboard loading for every role
- Admin user management
- Students and teachers modules
- Attendance create, edit, and view flows
- Assignment publish, submit, grade, and parent visibility flows
- Announcements targeting and read states
- Library catalog, borrow, return, archive, and overdue states
- Fees import, export, account summary, and payment history
- Parent Portal linked-child views
- Dark mode readability
- Responsive layout on mobile web

Exit criteria:

- No blank screens on primary routes
- No tenant-context errors during normal signed-in use
- No role can access restricted write actions
- Demo tenant data is consistent across modules

### Phase B: Backend API and Supabase hardening

Goal: make backend behavior consistent, secure, and easy to validate.

Recommended work:

- Add route tests for all role-restricted write endpoints
- Add tenant isolation tests for every major collection
- Confirm all API responses use stable DTO shapes
- Confirm idempotency for import and payment-style operations
- Add structured error responses for common failures
- Review Supabase storage buckets and attachment access rules
- Verify seed scripts clear and rebuild demo data safely

Exit criteria:

- API routes reject cross-tenant access
- Tests cover admin, teacher, student, parent, librarian, accountant, and staff roles
- Demo seed can be rerun without duplicate or stale data problems

### Phase C: Web app completion

Goal: finish the web product for staff/admin workflows and parent/student visibility.

Recommended work:

- Complete All Users create, update, role-change, deactivate, and delete flows
- Add admin tenant switch controls where needed
- Improve import progress and large-file feedback for Fees
- Add export buttons for core reports
- Add audit log visibility for privileged actions
- Add consistent empty, loading, and error states
- Finish accessibility and keyboard navigation checks

Exit criteria:

- Admin can manage users and roles without direct database edits
- Staff workflows are usable in a live demo
- Every page has reliable loading, empty, error, and success states

### Phase D: Mobile app expansion

Goal: make mobile more than a basic companion app.

Priority mobile workflows:

- Parent dashboard for linked children
- Student assignments list, details, submission status, and feedback
- Attendance summary
- Announcements and notification center
- Fees summary and payment history
- Library borrowed items and due dates
- Chat or messaging summary if supported by backend
- Offline-friendly loading states and retry behavior

Exit criteria:

- Android debug build passes CI
- Mobile app uses shared API/services where possible
- Mobile has role-aware navigation
- Mobile supports the most important student and parent daily workflows

### Phase E: Production deployment readiness

Goal: make deployments repeatable and safe.

Recommended work:

- Document required environment variables for web, mobile, functions, and Supabase
- Verify Vercel web deployment points to the correct API base URL
- Verify API deployment health checks
- Add smoke tests for deployed web and API URLs
- Document Android APK build and install flow
- Add rollback notes for web and backend deploys

Exit criteria:

- A new developer can deploy from documentation
- Production-like environment passes smoke tests
- API base URL and tenant headers are consistently configured

### Phase F: Sales-demo readiness

Goal: make the app reliable for school demos.

Recommended work:

- Add a repeatable two-tenant demo dataset
- Include users for admin, principal, teacher, student, parent, librarian, accountant, and staff
- Add demo scripts for each role
- Add screenshots or GIF-ready walkthrough notes
- Confirm demo data includes attendance, assignments, announcements, library, fees, and parent portal examples

Exit criteria:

- Demo can be reset and rerun consistently
- Every role has meaningful data
- Demo script avoids dead ends and unfinished flows

## Suggested next engineering phase

The next code phase should be **Phase 23: User Management Hardening**.

Why:

- User management is central for a school SaaS platform.
- Admin role, tenant switching, and user lifecycle issues affect every other module.
- Fixing this before more feature work reduces demo risk.

Recommended Phase 23 scope:

- Audit current user management UI and backend routes
- Fix add-user modal alignment and dark-mode readability
- Verify create, update, role-change, deactivate, and delete flows
- Add admin tenant switch support if not already complete
- Add tests for restricted user-management actions

## Summary

The repo has made strong progress toward a full-stack web product, especially around shared API boundaries, library behavior, fees templates, and CI enforcement. The biggest remaining gap is mobile depth: the mobile app still needs parent and student workflows that match the most important web capabilities. The next highest-leverage backend/web phase is user management hardening, followed by mobile expansion and deployment smoke testing.
