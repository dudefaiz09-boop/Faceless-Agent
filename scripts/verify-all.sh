#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

print_section() {
  echo ""
  echo "===================================================="
  echo "$1"
  echo "===================================================="
}

status_install="SKIPPED"
status_format="SKIPPED"
status_lint="SKIPPED"
status_test="SKIPPED"
status_api_build="SKIPPED"
status_web_build="SKIPPED"
status_monorepo_build="SKIPPED"
status_mobile_test="SKIPPED"
status_mobile_lint="SKIPPED"
status_android="SKIPPED"
status_ios="SKIPPED"

note_install=""
note_android=""
note_ios=""

fatal_rc=0

run_step() {
  local label="$1"
  local status_var="$2"
  shift 2

  print_section "$label"
  echo "+ $*"

  "$@"
  local rc=$?

  if [ $rc -eq 0 ]; then
    eval "$status_var='PASS'"
  else
    eval "$status_var='FAIL'"
  fi

  return $rc
}

skip_step() {
  local status_var="$1"
  local note_var="$2"
  local reason="$3"
  eval "$status_var='SKIPPED'"
  eval "$note_var=\"\$reason\""
}

uname_s="$(uname -s 2>/dev/null | tr '[:upper:]' '[:lower:]' || true)"
uname_r="$(uname -r 2>/dev/null | tr '[:upper:]' '[:lower:]' || true)"

is_macos=false
is_linux=false
is_windows_bash=false
is_wsl=false

case "$uname_s" in
  darwin)
    is_macos=true
    ;;
  linux)
    is_linux=true
    if [ -f /proc/sys/kernel/osrelease ] && grep -qi microsoft /proc/sys/kernel/osrelease; then
      is_wsl=true
    elif [[ "$uname_r" == *microsoft* ]]; then
      is_wsl=true
    fi
    ;;
  mingw*|msys*|cygwin*)
    is_windows_bash=true
    ;;
esac

android_dir="apps/mobile/android"
ios_dir="apps/mobile/ios"

has_android=false
has_ios=false

if [ -d "$android_dir" ]; then
  has_android=true
fi
if [ -d "$ios_dir" ]; then
  has_ios=true
fi

print_section "Environment"
echo "+ node -v"
node -v
echo "+ corepack enable"
if ! corepack enable; then
  echo "WARN: corepack enable failed. Attempting local corepack shims under .corepack/shims..."
  mkdir -p "$ROOT_DIR/.corepack/shims" 2>/dev/null || true
  if corepack enable --install-directory "$ROOT_DIR/.corepack/shims"; then
    export PATH="$ROOT_DIR/.corepack/shims:$PATH"
    echo "OK: Using local corepack shims at $ROOT_DIR/.corepack/shims"
  else
    echo "WARN: corepack enable (local shims) also failed (continuing). You may need admin/sudo depending on your OS."
  fi
fi
echo "+ corepack pnpm -v"
corepack pnpm -v

if $has_android; then
  print_section "Android Prereqs"
  echo "+ java -version"
  if command -v java >/dev/null 2>&1; then
    java -version
  else
    echo "WARN: java not found. Android builds will likely fail."
  fi
fi

if $is_macos; then
  print_section "macOS Prereqs"
  echo "+ xcodebuild -version"
  if command -v xcodebuild >/dev/null 2>&1; then
    xcodebuild -version
  else
    echo "WARN: xcodebuild not found. iOS builds will be skipped."
  fi
fi

if $has_ios; then
  print_section "CocoaPods (iOS)"
  echo "+ pod --version"
  if command -v pod >/dev/null 2>&1; then
    pod --version
  else
    echo "WARN: pod not found. iOS builds will likely fail."
  fi
fi

# 1) Install
print_section "Install (frozen lockfile)"
echo "+ corepack pnpm install --frozen-lockfile"
corepack pnpm install --frozen-lockfile
install_rc=$?
if [ $install_rc -eq 0 ]; then
  status_install="PASS"
else
  echo "WARN: Frozen install failed; retrying without --frozen-lockfile (this may update pnpm-lock.yaml)."
  note_install="Frozen lockfile install failed; fell back to non-frozen install."
  corepack pnpm install
  install_rc=$?
  if [ $install_rc -eq 0 ]; then
    status_install="PASS"
  else
    status_install="FAIL"
    fatal_rc=$install_rc
  fi
fi

if [ "$status_install" = "FAIL" ]; then
  goto_summary=true
else
  goto_summary=false
fi

# 2) Quality
if ! $goto_summary; then
  run_step "Format (check)" status_format corepack pnpm format:check || fatal_rc=$?
fi
if ! $goto_summary && [ $fatal_rc -eq 0 ]; then
  run_step "Lint" status_lint corepack pnpm lint || fatal_rc=$?
fi
if ! $goto_summary && [ $fatal_rc -eq 0 ]; then
  run_step "Test" status_test corepack pnpm test || fatal_rc=$?
fi

# 3) Builds (fail-fast if critical)
if [ $fatal_rc -eq 0 ]; then
  run_step "Build API (@educonnect/functions)" status_api_build corepack pnpm --filter @educonnect/functions build || fatal_rc=$?
fi
if [ $fatal_rc -eq 0 ]; then
  run_step "Build Web (@educonnect/web)" status_web_build corepack pnpm --filter @educonnect/web build || fatal_rc=$?
fi
if [ $fatal_rc -eq 0 ]; then
  run_step "Build Monorepo (turbo build)" status_monorepo_build corepack pnpm build || fatal_rc=$?
fi

# 4) Mobile JS checks (non-critical for web/api readiness)
if [ $fatal_rc -eq 0 ]; then
  run_step "Mobile Tests (JS)" status_mobile_test corepack pnpm --filter mobile test || true
  run_step "Mobile Lint" status_mobile_lint corepack pnpm --filter mobile lint || true
fi

# 5) Android native build
if $has_android && [ $fatal_rc -eq 0 ]; then
  print_section "Android Build"
  echo "+ cd $android_dir"
  cd "$android_dir" || {
    status_android="FAIL"
    note_android="Failed to enter $android_dir"
  }

  if [ "$status_android" != "FAIL" ]; then
    echo "+ chmod +x ./gradlew || true"
    chmod +x ./gradlew 2>/dev/null || true
    echo "+ ./gradlew clean"
    if ./gradlew clean; then
      echo "+ ./gradlew assembleDebug"
      if ./gradlew assembleDebug; then
        status_android="PASS"

        # Only attempt release build if signing props are configured
        if grep -q "MYAPP_RELEASE_STORE_FILE" gradle.properties 2>/dev/null || [ -n "${MYAPP_RELEASE_STORE_FILE:-}" ]; then
          echo "+ ./gradlew assembleRelease"
          if ! ./gradlew assembleRelease; then
            status_android="FAIL"
            note_android="assembleRelease failed"
          fi
        else
          note_android="assembleRelease skipped (release signing not configured)"
        fi
      else
        status_android="FAIL"
        note_android="assembleDebug failed"
      fi
    else
      status_android="FAIL"
      note_android="gradlew clean failed"
    fi
  fi

  cd "$ROOT_DIR" || true
else
  if ! $has_android; then
    status_android="SKIPPED"
    note_android="apps/mobile/android is missing"
  elif [ $fatal_rc -ne 0 ]; then
    status_android="SKIPPED"
    note_android="Skipped due to earlier critical failure"
  fi
fi

# 6) iOS native build (macOS only)
if $is_macos && $has_ios && [ $fatal_rc -eq 0 ]; then
  print_section "iOS Build"
  cd "$ios_dir" || {
    status_ios="FAIL"
    note_ios="Failed to enter $ios_dir"
  }

  if [ "$status_ios" != "FAIL" ]; then
    if [ ! -f Podfile ]; then
      status_ios="SKIPPED"
      note_ios="Podfile missing. Restore/generate apps/mobile/ios before iOS builds can run."
    elif ! command -v xcodebuild >/dev/null 2>&1; then
      status_ios="SKIPPED"
      note_ios="xcodebuild not found (Xcode missing)"
    else
      if command -v pod >/dev/null 2>&1; then
        echo "+ pod install"
        if ! pod install; then
          status_ios="FAIL"
          note_ios="pod install failed"
        fi
      else
        status_ios="SKIPPED"
        note_ios="CocoaPods not installed (pod not found)"
      fi

      if [ "$status_ios" != "FAIL" ] && [ "$status_ios" != "SKIPPED" ]; then
        workspace="$(ls -1 *.xcworkspace 2>/dev/null | head -n 1 || true)"
        project="$(ls -1 *.xcodeproj 2>/dev/null | head -n 1 || true)"

        # Best-effort scheme detection; fallback to a common default
        scheme="${IOS_SCHEME:-mobile}"

        if [ -n "$workspace" ]; then
          echo "+ xcodebuild -workspace \"$workspace\" -scheme \"$scheme\" -configuration Debug -sdk iphonesimulator -derivedDataPath build"
          if xcodebuild -workspace "$workspace" -scheme "$scheme" -configuration Debug -sdk iphonesimulator -derivedDataPath build; then
            status_ios="PASS"
          else
            status_ios="FAIL"
            note_ios="xcodebuild failed"
          fi
        elif [ -n "$project" ]; then
          echo "+ xcodebuild -project \"$project\" -scheme \"$scheme\" -configuration Debug -sdk iphonesimulator -derivedDataPath build"
          if xcodebuild -project "$project" -scheme "$scheme" -configuration Debug -sdk iphonesimulator -derivedDataPath build; then
            status_ios="PASS"
          else
            status_ios="FAIL"
            note_ios="xcodebuild failed"
          fi
        else
          status_ios="SKIPPED"
          note_ios="No .xcworkspace or .xcodeproj found in apps/mobile/ios"
        fi
      fi
    fi
  fi

  cd "$ROOT_DIR" || true
else
  if ! $is_macos; then
    status_ios="SKIPPED"
    note_ios="Skipping iOS build: iOS requires macOS + Xcode."
  elif ! $has_ios; then
    status_ios="SKIPPED"
    note_ios="iOS native project is missing. Restore/generate apps/mobile/ios before iOS builds can run."
  elif [ $fatal_rc -ne 0 ]; then
    status_ios="SKIPPED"
    note_ios="Skipped due to earlier critical failure"
  fi
fi

print_section "Summary"
printf "Install:            %s%s\n" "$status_install" "${note_install:+  ($note_install)}"
printf "Format:             %s\n" "$status_format"
printf "Lint:               %s\n" "$status_lint"
printf "Test:               %s\n" "$status_test"
printf "API build:          %s\n" "$status_api_build"
printf "Web build:          %s\n" "$status_web_build"
printf "Monorepo build:     %s\n" "$status_monorepo_build"
printf "Mobile test:        %s\n" "$status_mobile_test"
printf "Mobile lint:        %s\n" "$status_mobile_lint"
printf "Android:            %s%s\n" "$status_android" "${note_android:+  ($note_android)}"
printf "iOS:                %s%s\n" "$status_ios" "${note_ios:+  ($note_ios)}"

if [ $fatal_rc -ne 0 ]; then
  echo ""
  echo "FAILED: One or more critical checks failed."
  exit $fatal_rc
fi

if [ "$status_android" = "FAIL" ] || [ "$status_ios" = "FAIL" ]; then
  echo ""
  echo "WARN: Native mobile build failures detected. Web/API checks passed."
  exit 2
fi

echo ""
echo "OK: All requested checks passed (some may have been skipped)."
