# EduConnect-App

A comprehensive education management system connecting students, parents, and teachers with features for attendance, assignments, fees, and communication.

## 🚀 Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide React, Framer Motion
- **Backend:** Node.js, Express, Firebase Admin SDK, Google Generative AI
- **Mobile:** React Native, Firebase
- **Testing:** Jest, Supertest, Playwright, Artillery
- **CI/CD:** GitHub Actions, Cloud Run

## 📁 Architecture

This project is a monorepo managed by **pnpm** and **TurboRepo**:

- `apps/web`: React + Vite frontend.
- `apps/mobile`: React Native mobile app.
- `apps/functions`: Firebase Functions backend (Gen 2).
- `packages/*`: Shared logic, types, and analytics.

## 🛠 Getting Started

### Prerequisites

- Node.js (v22+)
- pnpm (v11+)
- Firebase CLI
- Android Studio / Xcode (for mobile)

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Configure environment variables (see `.env.example` in each app).

### Development

Run all apps in dev mode:
```bash
pnpm dev
```

## 🚀 Deployment & Release

For production deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md) and [RELEASE_GUIDE.md](./RELEASE_GUIDE.md).

Quick Deploy:
```bash
./deploy.sh web        # Deploy frontend
./deploy.sh functions  # Deploy backend
./deploy.sh android    # Build Android release
```

## 🧪 Testing

Run API tests:

```bash
npm test
```

Run UI tests:

```bash
npm run test:ui
```

## 🔒 Security

- Content Security Policy (CSP) enabled via Helmet.
- Input validation using Zod.
- Rate limiting on API routes.
- Secure authentication via Firebase Auth.
- Role-based access control (RBAC).

## 📄 License

MIT
