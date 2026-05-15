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
```

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
