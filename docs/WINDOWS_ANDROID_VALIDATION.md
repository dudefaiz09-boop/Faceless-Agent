# Windows Android Validation Guide

Use this guide before running the Phase 34 Windows release validation command:

```powershell
corepack pnpm validate:release:win
```

## Required versions

- Node.js 22+
- pnpm through Corepack
- JDK 17 or JDK 21
- Android SDK Platform 34
- Android SDK Build Tools 34.0.0
- Android platform-tools for `adb`

Do not use JDK 26 for this React Native/Gradle stack. Gradle can fail with unsupported class file errors when `JAVA_HOME` points to a newer unsupported JDK.

## PowerShell environment setup

Run these commands in the same PowerShell session used for validation. Adjust paths if Android Studio or the SDK are installed elsewhere.

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:Path"
```

Verify the tools:

```powershell
java -version
adb version
corepack pnpm --version
```

Expected notes:

- `java -version` should show JDK 17 or 21.
- `adb version` should print Android Debug Bridge details.
- `corepack pnpm --version` should work without requiring `corepack enable` as Administrator.

## Build the debug APK only

For a faster Android-only check:

```powershell
corepack pnpm --filter mobile build:android
```

Expected APK path:

```text
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

## Install on a connected device or emulator

Confirm a device is visible:

```powershell
adb devices
```

Install the APK:

```powershell
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Launch logs while opening the app:

```powershell
adb logcat | Select-String -Pattern 'EduConnect|ReactNative|AndroidRuntime|FATAL EXCEPTION'
```

## Common fixes

### `JAVA_HOME is set to an invalid directory`

Set `JAVA_HOME` to the JDK folder, not the `bin` folder:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
```

### `adb is not recognized`

Add platform-tools to the current session path:

```powershell
$env:Path = "$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:Path"
```

### API works in browser but not APK

Do not point the installed APK at `localhost`, `127.0.0.1`, or `10.0.2.2` for production-style testing. Use the deployed API URL in `apps/mobile/.env`.

Required mobile environment keys:

```text
API_BASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

## Full release validation

After the Android-only build works, run:

```powershell
corepack pnpm validate:release:win
```

This command runs repository checks, web/API/shared builds, mobile tests, and the Android debug build.
