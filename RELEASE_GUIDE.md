# EduConnect Release Guide

This document outlines the procedures for production web deployment and Android release.

## 🌐 Web Production Deployment

The web application is deployed to **Firebase Hosting**.

### Prerequisites
- Build shared packages: `pnpm turbo build --filter="./packages/*"`
- Production environment variables in `apps/web/.env`

### Commands
```bash
./deploy.sh web
```

### Rollback
```bash
firebase hosting:clone web:<version_id> web:live
```

---

## 🤖 Android Production Release

The Android app is built as an **Android App Bundle (AAB)** for Play Store distribution.

### 1. Release Signing Setup
Create (or update) `apps/mobile/android/gradle.properties` with the following secrets (DO NOT COMMIT):

```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=*****
MYAPP_RELEASE_KEY_PASSWORD=*****
```

Place your `.keystore` file in `apps/mobile/android/app/`.

### 2. Environment Configuration
Ensure `apps/mobile/src/config/env.ts` is NOT in `__DEV__` mode during the build. The build script automatically handles this via the release variant.

### 3. Build Commands
```bash
./deploy.sh android
```

Output path: `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`

---

## ⚡ Cloud Functions Deployment

### Prerequisites
- Vertex AI API enabled in GCP
- GEMINI_API_KEY set in **Google Cloud Secret Manager**

### Commands
```bash
./deploy.sh functions
```

---

## ✅ Production Checklist

- [ ] All shared packages are built and typed.
- [ ] `apps/web/.env` contains production Firebase credentials.
- [ ] No `localhost` references in production bundles.
- [ ] CSP headers verified in `firebase.json`.
- [ ] Android keystore is valid and properties are set.
- [ ] Backend secrets are configured in Secret Manager.
