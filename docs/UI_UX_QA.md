# UI/UX QA Automation

This repo uses a lightweight UI/UX QA system for the React web app in `apps/web`.

## Repo inspection summary

- Frontend framework: React 19 with Vite and React Router.
- Package manager: pnpm 11 in a TurboRepo monorepo.
- Web start command: `pnpm --filter @educonnect/web dev` for dev, or `pnpm --filter @educonnect/web build && pnpm --filter @educonnect/web preview --host 127.0.0.1 --port 4173` for QA.
- Routing: `apps/web/src/App.tsx` defines public auth routes and protected application routes.
- Authentication: Supabase Auth via `apps/web/src/contexts/AuthContext.tsx`.
- Roles: profile roles are read from the `documents` collection and Supabase app metadata in `AuthContext`.
- Route authorization: `ModuleGuard` uses `canAccessModule` from `@educonnect/shared`.
- API authorization: protected API routes run through auth and tenant middleware in `apps/functions/src/app.ts`.
- Storybook: no Storybook config was found, so Percy is the better visual regression fit instead of Chromatic.

## QA modes

### PR mode

Fast pull request coverage:

```bash
pnpm qa:pr
```

This runs Playwright smoke checks, basic axe checks, and responsive screenshot capture for key public pages and important protected routes. Protected routes use the first configured QA role; without credentials, protected routes are expected to redirect to login.

### Full audit mode

Full repo/app audit:

```bash
pnpm qa:full
```

This runs the wider route list, role-aware checks where credentials are present, screenshots at desktop/tablet/mobile widths, axe checks, protected API smoke checks, and Lighthouse CI.

### Role matrix mode

```bash
pnpm qa:roles
```

This uses dedicated QA users for each role and checks that allowed routes render while disallowed routes show the app's access denied state.

### Visual regression mode

```bash
pnpm test:visual
```

Percy is used because this repo does not currently have Storybook. Set `PERCY_TOKEN` locally or as a GitHub Actions secret. Do not commit private Percy tokens.

## Install and browser setup

```bash
pnpm install
pnpm qa:ui:install
```

The QA scripts use pinned `pnpm dlx` packages for Playwright, axe, Lighthouse CI, and Percy to avoid changing the app runtime dependency graph.

## Required local environment

Copy `.env.example` and fill in dedicated QA accounts only. Never use production user accounts.

Minimum PR-mode secrets/local variables:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_BASE_URL=/api
WEB_QA_DEFAULT_ROLE=admin
WEB_QA_ADMIN_EMAIL=qa-admin@example.com
WEB_QA_ADMIN_PASSWORD=...
```

Full role matrix variables:

```bash
WEB_QA_ADMIN_EMAIL=...
WEB_QA_ADMIN_PASSWORD=...
WEB_QA_PRINCIPAL_EMAIL=...
WEB_QA_PRINCIPAL_PASSWORD=...
WEB_QA_TEACHER_EMAIL=...
WEB_QA_TEACHER_PASSWORD=...
WEB_QA_STUDENT_EMAIL=...
WEB_QA_STUDENT_PASSWORD=...
WEB_QA_PARENT_EMAIL=...
WEB_QA_PARENT_PASSWORD=...
WEB_QA_LIBRARIAN_EMAIL=...
WEB_QA_LIBRARIAN_PASSWORD=...
WEB_QA_ACCOUNTANT_EMAIL=...
WEB_QA_ACCOUNTANT_PASSWORD=...
WEB_QA_STAFF_EMAIL=...
WEB_QA_STAFF_PASSWORD=...
```

Optional visual testing:

```bash
PERCY_TOKEN=...
QA_FULL_VISUAL=true
```

## GitHub Actions secrets

Add these repository secrets for PR mode:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`
- `WEB_QA_ADMIN_EMAIL`
- `WEB_QA_ADMIN_PASSWORD`

Add the other `WEB_QA_<ROLE>_EMAIL` and `WEB_QA_<ROLE>_PASSWORD` secrets to enable full role matrix coverage in manual or scheduled full audits.

Add `PERCY_TOKEN` to enable Percy visual regression uploads.

## Route list and role matrix

The manually maintained QA route list and role matrix live in:

```text
qa/e2e/routes.ts
```

Update that file whenever `apps/web/src/App.tsx` adds, removes, or renames routes or when `packages/shared/src/roles.ts` changes default module access.

## Generated reports

Reports and screenshots are generated under:

- `qa/results/playwright-report`
- `qa/results/playwright-artifacts`
- `qa/results/lighthouse`

These paths are gitignored and uploaded as GitHub Actions artifacts.

## Creating safe QA users

Use non-production Supabase users dedicated to QA. Assign each user one role matching the role matrix in `qa/e2e/routes.ts`. The simplest setup is to create users through the app/admin tooling or demo seed process, then store their credentials only in local `.env` files or GitHub Actions secrets.

## Notes and limitations

- PR mode is intentionally small and fast.
- Full role coverage depends on having all QA role credentials configured.
- Percy is opt-in and requires `PERCY_TOKEN`.
- Lighthouse currently audits public auth pages only. Authenticated Lighthouse audits can be added later if stable persisted auth state is needed.
