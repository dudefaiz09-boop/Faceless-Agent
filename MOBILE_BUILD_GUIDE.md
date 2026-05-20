# Mobile Build Guide (React Native)

This repository includes a React Native app at `apps/mobile`.

## Quick Start

From the repo root:

```bash
corepack enable
pnpm install
pnpm verify
```

## Android

### Prerequisites

- Node.js (repo expects Node `>=22`)
- `corepack` + `pnpm`
- JDK 17
- Android Studio + Android SDK
- An emulator or physical device

Environment variables (typical):

- `ANDROID_HOME` or `ANDROID_SDK_ROOT` pointing to your Android SDK install

### Common Commands

```bash
# Setup Environment (required for valid backend connection)
# Copy the example and edit the variables with your Supabase URL, Anon Key, and API URL
cp apps/mobile/.env.mobile.example apps/mobile/.env

# JS-only checks
pnpm --filter mobile lint
pnpm --filter mobile test

# Run the app on a device/emulator (requires Android SDK)
pnpm --filter mobile android

# Build an APK (Debug)
pnpm --filter mobile build:android
pnpm --filter mobile build:android:debug

# Build an APK (Release) - requires signing config
pnpm --filter mobile build:android:release

# Install the built APK onto an attached device via ADB
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk

# View logs for crashes or debugging
adb logcat | Select-String -Pattern "educonnect|crash|fatal|error" # Windows PowerShell
# adb logcat | grep -i -E "educonnect|crash|fatal|error" # Linux/Mac
```

### GitHub Actions Build

The workflow `android-distribute.yml` automatically builds the app and uploads the APK.
To ensure the correct backend endpoints are compiled into the app, you MUST configure these three GitHub Repository Secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `API_BASE_URL`
  You can download the generated `android-apk` from the Artifacts tab of the latest successful GitHub Action run.

### Troubleshooting

- **`Permission denied` running Gradle wrapper**
  - On Linux/macOS/WSL/Git Bash, run: `chmod +x apps/mobile/android/gradlew`
- **Android SDK not found**
  - Ensure `ANDROID_HOME` / `ANDROID_SDK_ROOT` is set and Android Studio SDK Manager has installed a platform + build-tools.
- **Missing `local.properties`**
  - Android Studio usually generates this automatically.
  - If you need it manually, create `apps/mobile/android/local.properties`:
    - `sdk.dir=/absolute/path/to/Android/Sdk`
- **`Unsupported class file major version 70` (or similar)**
  - Your JDK is too new for the current Gradle/Android toolchain.
  - Use JDK 17 and ensure `JAVA_HOME` points to the JDK root (not the `bin/` directory).
- **Release build fails due to signing**
  - This repo does not commit signing keys.
  - Use `pnpm --filter mobile build:android` (Debug) for local verification unless you have release signing configured.

## iOS

### Current Status

`apps/mobile/ios` is **not present** on `main` right now, so iOS native builds cannot run yet.

The `pnpm --filter mobile ios` script will fail fast with:

> iOS native project is missing. Restore/generate apps/mobile/ios before iOS builds can run.

### Prerequisites (once `apps/mobile/ios` exists)

- macOS (iOS builds cannot run on Windows/Linux)
- Xcode
- CocoaPods (`pod`)

### Commands (once `apps/mobile/ios` exists)

```bash
pnpm --filter mobile ios
```

### Troubleshooting

- **`ios/Podfile` missing**
  - iOS native project is missing or incomplete. Restore/generate `apps/mobile/ios` first.
- **CocoaPods not installed**
  - Install CocoaPods on macOS, then run `pod install` inside `apps/mobile/ios`.
