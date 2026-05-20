# Mobile Build Guide

## Detected Mobile Stack

EduConnect mobile is a React Native app at `apps/mobile` with a native Android wrapper at `apps/mobile/android`.

It is not Capacitor, Cordova, Expo, or a packaged WebView/PWA APK.

- Android applicationId: `com.educonnect.app`
- Main activity: `com.educonnect.app.MainActivity`
- Debug APK output: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`
- GitHub Actions artifact: `android-apk`

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
```

## Required Public Mobile Env

Set these before building any downloadable APK:

```bash
API_BASE_URL=https://your-api-project.vercel.app/api
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

Rules:

- `API_BASE_URL` must be HTTPS for GitHub/downloadable APK artifacts.
- Do not use `localhost`, `127.0.0.1`, or `10.0.2.2` in packaged APK artifacts.
- Never add `SUPABASE_SERVICE_ROLE_KEY` to mobile env, GitHub mobile workflow env, or frontend/mobile code.
- If required public config is missing, the app shows a readable configuration screen instead of starting auth/API calls.

## Local APK Build

From the repo root:

```bash
corepack enable
pnpm install
pnpm --filter mobile lint
pnpm --filter mobile build:android
```

PowerShell with env:

```powershell
$env:API_BASE_URL = "https://your-api-project.vercel.app/api"
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_ANON_KEY = "your_supabase_anon_key"
pnpm --filter mobile build:android
```

For local development against an emulator API, explicitly set a local `API_BASE_URL` before `pnpm --filter mobile android`. Do not use local URLs for APK artifacts uploaded to GitHub Actions.

The debug build is intentionally bundled with fresh JS, even though it is a debug APK, because GitHub Actions publishes that APK as the downloadable artifact. The build must not rely on Metro or a checked-in `index.android.bundle`.

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

- Name: `android-apk`
- Path uploaded: `apps/mobile/android/app/build/outputs/apk/debug/*.apk`

Download it from the latest successful `Android Build` workflow run under the run's Artifacts section.

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

## Release Signing

Debug APKs install and launch without release signing. Release builds require signing properties and a keystore supplied outside the repo:

- `MYAPP_RELEASE_STORE_FILE`
- `MYAPP_RELEASE_STORE_PASSWORD`
- `MYAPP_RELEASE_KEY_ALIAS`
- `MYAPP_RELEASE_KEY_PASSWORD`

Do not commit keystores or signing secrets.
