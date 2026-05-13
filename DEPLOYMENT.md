# EduConnect Deployment Architecture

This monorepo uses a modular, production-grade deployment strategy powered by **TurboRepo**, **pnpm**, and **Firebase**.

## 🚀 Independent Deployable Targets

| Target | Technology | Hosting | Pipeline |
| :--- | :--- | :--- | :--- |
| **Web** | React + Vite | Firebase Hosting | `.github/workflows/deploy-web.yml` |
| **Backend** | Cloud Functions Gen2 | GCP Cloud Functions | `.github/workflows/deploy-functions.yml` |
| **Mobile** | React Native | Play Store / App Store | `.github/workflows/android-distribute.yml` |

## 🛠 Shared Package Strategy

Shared packages (`packages/*`) are built using `tsc` to the `dist/` folder.
- **Base Config**: `packages/tsconfig.base.json` provides unified compiler settings.
- **Path Mapping**: Packages resolve siblings via TypeScript paths for development speed and reliable builds.
- **Build Order**: TurboRepo ensures dependencies are built before consumers (e.g., `shared-api` builds after `shared`).

## 🔐 Environment Management

### Web (.env)
Use `apps/web/.env.example` as a template.
- Variables prefixed with `VITE_` are exposed to the browser.
- Production values are injected via GitHub Secrets.

### Backend (Secret Manager)
Sensitive keys (like `GEMINI_API_KEY`) are managed via **Google Cloud Secret Manager**.
- Access is declared in `apps/functions/src/index.ts` via `secrets: [...]`.

### Mobile (Dynamic Config)
Mobile environments are managed in `apps/mobile/src/config/env.ts`.
- Automatically switches between local emulators and production APIs based on `__DEV__`.

## 🔄 CI/CD Pipelines

1. **CI (`ci.yml`)**: Runs on every PR. Lints, typechecks, and builds all packages to verify integrity.
2. **Deploy Web**: Deploys to Firebase Hosting. Supports preview channels for PRs and the `live` channel for `main`.
3. **Deploy Functions**: Deploys only the Cloud Functions to production on push to `main`.

## 🛡 Security & Optimization

- **Security Headers**: Configured in `firebase.json` (CSP, HSTS, X-Frame-Options).
- **Cache Optimization**: Immutable caching for assets in `/assets/**`.
- **Cold Starts**: Backend optimized with concurrency (80) and memory (512MiB) for Gen2 functions.
- **Turbo Caching**: Environment-aware caching ensures CI re-runs are nearly instant if code hasn't changed.

## ⏪ Rollback Procedures

### Web
```bash
firebase hosting:clone web:<version_id> web:live
```

### Backend
Use the Google Cloud Console to redirect traffic to a previous version of the Cloud Function / Cloud Run service.
