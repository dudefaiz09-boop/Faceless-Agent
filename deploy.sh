#!/bin/bash
set -e

# EduConnect deployment helper
# Usage: ./deploy.sh [web|functions|android|all]

TARGET=${1:-all}

echo "Starting deployment helper for target: $TARGET"

echo "Building shared packages..."
corepack pnpm turbo build --filter="./packages/*"

case $TARGET in
  web)
    echo "Building Web for Cloudflare Pages..."
    if [ -f "apps/web/.env" ]; then
      echo "Loading environment variables from apps/web/.env"
      export $(grep -v '^#' apps/web/.env | xargs)
    fi
    corepack pnpm turbo build --filter @educonnect/web
    echo "Upload apps/web/dist to Cloudflare Pages or let GitHub Actions deploy it."
    ;;

  functions)
    echo "Building API bundle for Vercel..."
    corepack pnpm turbo build --filter @educonnect/functions
    echo "Deploy the repository root to Vercel; vercel.json serves api/index.ts."
    ;;

  android)
    echo "Building Android production release..."
    if [ ! -f "apps/mobile/android/app/release.keystore" ] && [ ! -f "../my-release-key.keystore" ]; then
      echo "WARNING: Keystore not found. Build will be unsigned or fail."
    fi
    cd apps/mobile/android
    ./gradlew bundleRelease
    echo "Android AAB built at: apps/mobile/android/app/build/outputs/bundle/release/app-release.aab"
    ;;

  all)
    echo "Building full monorepo..."
    corepack pnpm turbo build
    ;;

  *)
    echo "Unknown target: $TARGET"
    echo "Usage: ./deploy.sh [web|functions|android|all]"
    exit 1
    ;;
esac

echo "Done."
