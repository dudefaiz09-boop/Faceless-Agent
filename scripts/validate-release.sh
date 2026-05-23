#!/usr/bin/env bash
set -euo pipefail

run_step() {
  local label="$1"
  shift
  echo ""
  echo "==> ${label}"
  "$@"
}

run_step "Install dependencies" corepack pnpm install --frozen-lockfile
run_step "Check formatting" corepack pnpm format:check
run_step "Audit web shared API boundaries" corepack pnpm audit:web-shared-api
run_step "Lint workspace" corepack pnpm lint
run_step "Run tests" corepack pnpm test
run_step "Build shared package" corepack pnpm turbo build --filter @educonnect/shared
run_step "Build shared API package" corepack pnpm turbo build --filter @educonnect/shared-api
run_step "Build shared education package" corepack pnpm turbo build --filter @educonnect/shared-education
run_step "Build functions package" corepack pnpm turbo build --filter @educonnect/functions
run_step "Build web package" corepack pnpm turbo build --filter @educonnect/web
run_step "Typecheck mobile" corepack pnpm --filter mobile typecheck
run_step "Test mobile" corepack pnpm --filter mobile test
run_step "Build Android debug APK" corepack pnpm --filter mobile build:android

echo ""
echo "Release validation completed."
echo "Expected APK: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk"
