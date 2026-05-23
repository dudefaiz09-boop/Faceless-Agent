# EduConnect-App

A comprehensive education management system connecting students, parents, and teachers with features for attendance, assignments, fees, and communication.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide React, Framer Motion
- **Backend:** Node.js, Express, Supabase Admin, Google Generative AI
- **Mobile:** React Native, Supabase
- **Testing:** Jest, Supertest, Playwright, axe, Lighthouse CI, Percy
- **CI/CD:** GitHub Actions, Vercel, Supabase migrations

## Architecture

This project is a monorepo managed by **pnpm** and **TurboRepo**:

- `apps/web`: React + Vite frontend.
- `apps/mobile`: React Native mobile app with Android modules matching the web dashboard, announcements, attendance, assignments, chat, library, fees, performance, parent portal, students, teachers, and all-users surfaces.
- `apps/functions`: Standalone Express API for free-tier Node hosting.
- `packages/*`: Shared logic, types, and analytics.

## Getting Started

### Prerequisites

- Node.js v22+
- pnpm v11+
- Supabase CLI
- Mobile builds: see [MOBILE_BUILD_GUIDE.md](./MOBILE_BUILD_GUIDE.md) (Android and iOS native projects are under `apps/mobile/android` and `apps/mobile/ios`; iOS builds require macOS + Xcode)

### Installation

1. Clone the repository.
2. Install dependencies:

```bash
pnpm install
```

3. Configure environment variables. Use `.env.example` in the repository root and each app as templates.

For the web app, `apps/web/src/lib/env.ts` validates required Vite variables at startup. The app fails fast if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing instead of creating an unsafe empty Supabase client.

For production web deployments on Vercel, set `VITE_API_BASE_URL` on the web project to the deployed API URL ending in `/api`, for example `https://educonnect-api-sigma.vercel.app/api`. Do not leave production at `/api` unless the API is served from the same origin as the web app. Local development can use `/api` because `apps/web/vite.config.ts` proxies it to the local API. Redeploy the web app after changing any `VITE_*` variable because Vite embeds them at build time.

For mobile, copy `apps/mobile/.env.example` to `apps/mobile/.env` and set `API_BASE_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` before building. The mobile app also accepts the `VITE_*` aliases used by the web migration, but it must never receive `SUPABASE_SERVICE_ROLE_KEY`. After changing `.env`, rebuild and reinstall the app because React Native env values are bundled at build time.

Windows Android build:

```powershell
cd "D:\Educonnect-Migration\EduConnect-App-supabase-migration"
notepad .\apps\mobile\.env
cd .\apps\mobile\android
.\gradlew clean
.\gradlew assembleDebug
```

macOS iOS build:

```bash
cd apps/mobile
pnpm install
cd ios
pod install
cd ..
pnpm ios
```

### Development

Run all apps in dev mode:

```bash
pnpm dev
```

## Deployment & Release

For production deployment instructions, see [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md), [DEPLOYMENT.md](./DEPLOYMENT.md), [MIGRATION_SUPABASE.md](./MIGRATION_SUPABASE.md), and [RELEASE_GUIDE.md](./RELEASE_GUIDE.md).

Quick deploy checks:

```bash
./deploy.sh web        # Build frontend
./deploy.sh functions  # Build backend API
./deploy.sh android    # Build Android release
```

Demo data can be seeded from the manual `Seed Supabase Demo Data` GitHub Actions workflow after adding `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as repository secrets.

### AI Configuration (Optional)

The AI Assistant uses OpenRouter and is strictly restricted to free models to avoid accidental costs.

**Required environment variables for the API:**

- `OPENROUTER_API_KEY`: Your OpenRouter API key.
- `OPENROUTER_MODEL`: OpenRouter free model slug (e.g., `google/gemma-3-4b-it:free`).

**Safety Notes:**

- Only OpenRouter free model slugs (ending in `:free`) are supported.
- The system prioritizes `google/gemma-3-4b-it:free`, then retries with other free models (Mistral, Llama) if the primary fails.
- If a paid or invalid model is configured, the system automatically falls back to the approved free list.
- Direct OpenAI API keys or paid models (e.g., GPT-4) are blocked and will return a zero-cost rejection message.
- Factual school data is retrieved from the database first; AI is only used for natural-language explanations.

## Testing

Run the monorepo test pipeline:

```bash
pnpm test
```

Run fast PR UI/UX QA:

```bash
pnpm qa:pr
```

Run the full UI/UX audit:

```bash
pnpm qa:full
```

Run role-based access checks:

```bash
pnpm qa:roles
```

See [docs/UI_UX_QA.md](./docs/UI_UX_QA.md) for Playwright, axe, Lighthouse, Percy, role test user, environment, and GitHub secret setup.

## Security

- Content Security Policy is enabled for the web app.
- API hardening uses Helmet, compression, validation, and rate limits.
- Secure authentication is handled by Supabase Auth.
- Role-based access control protects app routes and API actions.
- Frontend auth forms use Zod and React Hook Form validation with friendly error messages.
- Password reset is available at `/auth/forgot-password` and `/auth/reset-password`.
- Client-side route guards are paired with backend token and tenant validation; do not treat browser-only routing as the authorization boundary.
- Future auth rate limiting should be added at the API/auth edge with Upstash, Vercel Firewall, or Supabase-side controls.

## License

MIT