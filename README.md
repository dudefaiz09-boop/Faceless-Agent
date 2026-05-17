# EduConnect-App

A comprehensive education management system connecting students, parents, and teachers with features for attendance, assignments, fees, and communication.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide React, Framer Motion
- **Backend:** Node.js, Express, Supabase Admin, Google Generative AI
- **Mobile:** React Native, Supabase
- **Testing:** Jest, Supertest, Playwright, Artillery
- **CI/CD:** GitHub Actions, Vercel, Supabase migrations

## Architecture

This project is a monorepo managed by **pnpm** and **TurboRepo**:

- `apps/web`: React + Vite frontend.
- `apps/mobile`: React Native mobile app.
- `apps/functions`: Standalone Express API for free-tier Node hosting.
- `packages/*`: Shared logic, types, and analytics.

## Getting Started

### Prerequisites

- Node.js v22+
- pnpm v11+
- Supabase CLI
- Mobile builds: see [MOBILE_BUILD_GUIDE.md](./MOBILE_BUILD_GUIDE.md) (Android supported; iOS requires macOS + an `apps/mobile/ios` native project)

### Installation

1. Clone the repository.
2. Install dependencies:

```bash
pnpm install
```

3. Configure environment variables. Use `.env.example` in the repository root and each app as templates.

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

Run UI tests:

```bash
pnpm exec playwright test
```

## Security

- Content Security Policy is enabled for the web app.
- API hardening uses Helmet, compression, validation, and rate limits.
- Secure authentication is handled by Supabase Auth.
- Role-based access control protects app routes and API actions.

## License

MIT
