#!/bin/bash
set -e

# EduConnect Monorepo Unified Deployment Script
# Usage: ./deploy.sh [web|functions|android|all]

TARGET=${1:-all}

echo "🚀 Starting deployment for target: $TARGET"

# 1. Shared Package Build (Foundation)
echo "📦 Building shared packages..."
pnpm turbo build --filter="./packages/*"

case $TARGET in
  web)
    echo "🌐 Deploying Web to Firebase Hosting..."
    pnpm turbo build --filter @educonnect/web
    pnpm exec firebase deploy --only hosting:web
    ;;
  
  functions)
    echo "⚡ Deploying Cloud Functions..."
    pnpm exec firebase deploy --only functions
    ;;

  android)
    echo "🤖 Building Android Production Release..."
    # Check for keystore
    if [ ! -f "apps/mobile/android/app/release.keystore" ] && [ ! -f "../my-release-key.keystore" ]; then
      echo "⚠️ WARNING: Keystore not found. Build will be unsigned or fail."
    fi
    cd apps/mobile/android
    ./gradlew bundleRelease
    echo "✅ Android AAB built at: apps/mobile/android/app/build/outputs/bundle/release/app-release.aab"
    ;;

  all)
    echo "🌟 Running full monorepo deployment..."
    pnpm turbo build
    pnpm exec firebase deploy
    cd apps/mobile/android && ./gradlew bundleRelease
    ;;

  *)
    echo "❌ Unknown target: $TARGET"
    echo "Usage: ./deploy.sh [web|functions|android|all]"
    exit 1
    ;;
esac

echo "🎉 Deployment complete!"
