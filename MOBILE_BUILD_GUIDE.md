# Mobile Build Guide

## Detected Mobile Stack

EduConnect mobile is a React Native CLI app at `apps/mobile` with native Android and iOS projects.

It is not Capacitor, Cordova, Expo, or a packaged WebView/PWA APK.

- Android applicationId: `com.educonnect.app`
- iOS bundle identifier: `com.educonnect.app`
- iOS display name: `EduConnect`
- Main activity: `com.educonnect.app.MainActivity`
- Debug APK output: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK output: `apps/mobile/android/app/build/outputs/apk/release/app-release-unsigned.apk` unless release signing is configured
- Release AAB output: `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`
- GitHub Actions artifacts: `android-apk`, `android-release-apk`, `android-release-aab`, `ios-simulator-app`
- Hermes is enabled and `MainApplication.java` initializes SoLoader with `OpenSourceMergedSoMapping.INSTANCE`.

## Android Prerequisites

- Node.js 22 or newer
- Corepack with pnpm
- JDK 17 or 21. Do not build with JDK 26; Gradle fails with `Unsupported class file major version 70`.
- Android SDK Platform 34 and Build Tools 34.0.0
- `ANDROID_HOME` or `ANDROID_SDK_ROOT` pointing to the Android SDK
- A physical Android device or Android 16 emulator for launch/logcat verification

PowerShell example:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
$env:NODE_OPTIONS = "--max-old-space-size=4096 --max-semi-space-size=256"
```

## Required Public Mobile Env

Set these before building any downloadable APK:

```bash
API_BASE_URL=https://your-api-project.vercel.app/api
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

For local Windows builds, create `apps/mobile/.env` from `apps/mobile/.env.example`:

```powershell
cd "D:\Educonnect-Migration\EduConnect-App-supabase-migration"
notepad .\apps\mobile\.env
cd .\apps\mobile\android
.\gradlew clean
.\gradlew assembleDebug
```

The React Native bundle also accepts the existing migration aliases:

```bash
VITE_API_BASE_URL=https://your-api-project.vercel.app/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Rules:

- `API_BASE_URL` must be HTTPS for GitHub/downloadable APK artifacts.
- Do not use `localhost`, `127.0.0.1`, or `10.0.2.2` in packaged APK artifacts.
- Never add `SUPABASE_SERVICE_ROLE_KEY` to mobile env, GitHub mobile workflow env, or frontend/mobile code.
- If required public config is missing, the app shows a readable configuration screen instead of starting auth/API calls.
- Missing config is also logged during release/debug bundle creation; do not publish an APK that shows `App Not Configured`.
- After changing `apps/mobile/.env`, rebuild and reinstall the app. React Native env values are bundled at build time.
- Add `educonnect://auth/callback` and `educonnect://auth/reset-password` to Supabase Auth redirect URLs for mobile email confirmation and password reset.

## Mobile Feature Coverage

The Android app is a real React Native app, not a WebView. It mirrors the website's major modules with role-aware visibility from `@educonnect/shared`:

- Dashboard
- Announcements
- Attendance
- Assignments
- Chat
- Library
- Fees
- Performance
- Parent Portal
- Students
- Teachers
- All Users

Mobile uses bottom tabs for primary work and a More screen for secondary/admin modules. Inaccessible modules are hidden with the same `canAccessModule` rules used by the web app. The primary tabs are Home, Announcements, Assignments, Chat, and More. Attendance, Library, Fees, Performance, Parent Portal, Students, Teachers, All Users, Profile, Settings, and Sign out live under More when permitted by role.

Some web-only write workflows remain intentionally read-only on mobile unless the backend exposes a safe mobile contract:

- Fee CSV import/export and online payment launch
- Library file upload/edit/delete
- Performance CSV import/export
- User/student/teacher creation, bulk import, deactivation, and audit modal workflows

Those screens still use live Supabase documents or API routes and show loading, empty, retry, and forbidden/error states instead of fake production data.

## Local APK Build

From the repo root:

```bash
corepack enable
pnpm install
pnpm --filter mobile lint
pnpm --filter mobile build:android
pnpm --filter mobile verify:android-apk
```

PowerShell with env:

```powershell
$env:API_BASE_URL = "https://your-api-project.vercel.app/api"
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_ANON_KEY = "your_supabase_anon_key"
pnpm --filter mobile build:android
```

PowerShell full debug APK rebuild:

```powershell
cd "D:\Educonnect-Migration\EduConnect-App-supabase-migration"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$env:NODE_OPTIONS = "--max-old-space-size=4096 --max-semi-space-size=256"
pnpm install
pnpm --filter mobile lint
pnpm --filter mobile test
pnpm --filter mobile build:android:debug
cd .\apps\mobile\android
.\gradlew clean
.\gradlew assembleDebug
```

For local development against an emulator API, explicitly set a local `API_BASE_URL` before `pnpm --filter mobile android`. Do not use local URLs for APK artifacts uploaded to GitHub Actions.

The debug build is intentionally bundled with fresh JS, even though it is a debug APK, because GitHub Actions publishes that APK as the downloadable artifact. The build must not rely on Metro or a checked-in `index.android.bundle`.

The APK verifier checks that the downloadable APK contains:

- `lib/arm64-v8a/libhermes.so`
- `lib/arm64-v8a/libhermestooling.so`
- `assets/index.android.bundle`

It also fails if the packaged bundle contains localhost API URLs, `10.0.2.2`, `127.0.0.1`, or service-role-key markers. It confirms `libhermes_executor.so` is not packaged as an APK entry; React Native 0.76 with `OpenSourceMergedSoMapping` should not try to load that legacy library at startup.

## iOS Simulator Build

iOS builds require macOS, Xcode, CocoaPods, and the iOS simulator runtime. From macOS:

```bash
cd apps/mobile
pnpm install
cd ios
pod install
cd ..
pnpm ios
```

Or build directly with Xcode:

```bash
cd apps/mobile/ios
xcodebuild -workspace EduConnect.xcworkspace -scheme EduConnect -configuration Debug -sdk iphonesimulator
```

Physical iPhone `.ipa` release requires macOS, Xcode, an Apple Developer account, certificates, and provisioning profiles. Do not store Apple credentials or signing certificates in this repository.

## Local Release Build

Unsigned release outputs can be built without committing signing secrets:

```bash
pnpm --filter mobile build:android:release
```

Signed release outputs require the `ANDROID_*` Gradle properties described below. Keep the keystore outside git, or provide it through a secure CI secret/materialization step.

## Install And Capture Logs

```bash
adb devices
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
adb logcat -c
adb shell monkey -p com.educonnect.app 1
adb logcat -d > android-crash-log.txt
```

Filtered logcat:

```bash
adb logcat | grep -i -E "educonnect|reactnative|androidruntime|fatal|exception|crash|hermes"
```

PowerShell:

```powershell
adb logcat | Select-String -Pattern "educonnect|reactnative|androidruntime|fatal|exception|crash|hermes"
adb logcat -d | Select-String -Pattern "AndroidRuntime|FATAL EXCEPTION|educonnect|reactnative|hermes"
```

Look for `AndroidRuntime FATAL EXCEPTION`, Hermes/React Native JS exceptions, missing native classes/resources, or startup config errors.

## GitHub Actions APK Download

Workflow: `.github/workflows/android-distribute.yml`

Required GitHub Repository Secrets or Variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `API_BASE_URL`

Artifact:

- `android-apk`: `apps/mobile/android/app/build/outputs/apk/debug/*.apk`
- `android-release-apk`: `apps/mobile/android/app/build/outputs/apk/release/*.apk`
- `android-release-aab`: `apps/mobile/android/app/build/outputs/bundle/release/*.aab`

Download it from the latest successful `Android Build` workflow run under the run's Artifacts section.

The workflow validates public mobile env before building. It rejects missing values, non-HTTPS `API_BASE_URL`, localhost-style `API_BASE_URL`, and any `SUPABASE_ANON_KEY` that appears to be a service-role key. `SUPABASE_SERVICE_ROLE_KEY` may exist for backend workflows, but it is not passed to the mobile build.

## Android 16 Notes

Current native config:

- React Native `0.76.3`
- Android Gradle Plugin `8.7.2`
- Gradle `8.10.2`
- compileSdk `34`
- targetSdk `34`
- minSdk `24`
- Hermes enabled
- INTERNET permission present

Android 16 can run apps targeting SDK 34, but you should still test on Android 16 and inspect logcat. Official Android 16 behavior changes include ART/runtime compatibility work and target-SDK-36-only behavior changes; this app does not currently target SDK 36, so target-36 behavior changes do not apply yet.

Safe targetSdk 35 plan:

1. Upgrade Android SDK Platform 35 and Build Tools locally/CI.
2. Change `compileSdkVersion` and `targetSdkVersion` to `35` in `apps/mobile/android/build.gradle`.
3. Run `pnpm --filter mobile lint`, `pnpm --filter mobile build:android`, `pnpm --filter mobile verify:android-apk`, `./gradlew clean assembleDebug`, and `./gradlew assembleRelease bundleRelease`.
4. Install on Android 15 and Android 16 devices/emulators and inspect logcat for startup, auth, networking, window inset, and notification/runtime permission regressions.
5. Keep React Native `0.76.3` unless a dependency requires a paired upgrade; do not bump SDK and RN together without isolating failures.

This repo intentionally stays on targetSdk 34 until those checks pass.

## Release Signing

Debug APKs install and launch without release signing. Release builds require signing properties and a keystore supplied outside the repo:

- `ANDROID_KEYSTORE_FILE`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Do not commit keystores or signing secrets.

In GitHub Actions, expose these as secrets or variables only to the Android workflow:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

`ANDROID_KEYSTORE_BASE64` is decoded by the workflow to a temporary keystore file. Locally, set `ORG_GRADLE_PROJECT_ANDROID_KEYSTORE_FILE` to the keystore filename or path available to Gradle.

## Crash Reporting

Firebase/Google Services is optional. Local and CI builds skip it when `apps/mobile/android/app/google-services.json` is absent.

Firebase Crashlytics path:

1. Add Firebase Android app `com.educonnect.app`.
2. Download `google-services.json`.
3. Place it locally at `apps/mobile/android/app/google-services.json`, or create it securely in CI from a secret.
4. Add React Native Firebase Crashlytics packages in a dedicated dependency-change PR, then verify debug and release startup.

Sentry fallback:

1. Add `@sentry/react-native`.
2. Initialize Sentry only when a public DSN env var is present.
3. Keep DSN and upload tokens out of source control.

Do not block local builds when crash-reporting config is missing.

## Runtime Reliability Notes

The mobile app uses React Query with a five-minute stale window, 30-minute in-memory cache retention, bounded retry/backoff, and refetch-on-app-focus. Announcements and assignments include pull-to-refresh, loading skeletons, empty/error states, and last-synced timestamps.

Offline handling currently provides API reachability detection and an offline banner. Durable offline queues for attendance, assignments, announcements, fees, performance, and library should be backed by persistent storage such as AsyncStorage before accepting real offline submissions. Until that storage is added, avoid optimistic updates unless rollback is implemented for that mutation.
