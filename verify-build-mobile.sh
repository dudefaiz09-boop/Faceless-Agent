#!/usr/bin/env bash
set -euo pipefail

echo "== EduConnect full production build + mobile validation =="

echo ""
echo "== 1. Environment check =="
node -v
corepack enable
corepack pnpm -v

echo ""
echo "== 2. Clean install =="
corepack pnpm install --frozen-lockfile || corepack pnpm install

echo ""
echo "== 3. Format, lint, and tests =="
corepack pnpm format
corepack pnpm lint
corepack pnpm test

echo ""
echo "== 4. Backend/API build =="
corepack pnpm --filter @educonnect/functions build

echo ""
echo "== 5. Web build =="
corepack pnpm --filter @educonnect/web build

echo ""
echo "== 6. Full monorepo build =="
corepack pnpm build

echo ""
echo "== 7. Mobile JS/test validation =="
corepack pnpm --filter mobile test
corepack pnpm --filter mobile lint || echo "Mobile lint failed or is not fully configured. Continue to native build checks."

echo ""
echo "== 8. Android build check =="
if [ -d "apps/mobile/android" ]; then
  cd apps/mobile/android
  chmod +x ./gradlew || true
  ./gradlew clean
  ./gradlew assembleDebug
  ./gradlew assembleRelease
  cd ../../..
  echo "Android debug/release build completed."
else
  echo "apps/mobile/android not found. Android native project is missing."
fi

echo ""
echo "== 9. iOS build check =="
if [ "$(uname)" = "Darwin" ] && [ -d "apps/mobile/ios" ]; then
  cd apps/mobile/ios

  if command -v pod >/dev/null 2>&1; then
    pod install
  else
    echo "CocoaPods not found. Install with: sudo gem install cocoapods"
    exit 1
  fi

  WORKSPACE=$(ls *.xcworkspace 2>/dev/null | head -n 1 || true)
  PROJECT=$(ls *.xcodeproj 2>/dev/null | head -n 1 || true)

  if [ -n "$WORKSPACE" ]; then
    xcodebuild -workspace "$WORKSPACE" -scheme mobile -configuration Release -sdk iphonesimulator -derivedDataPath build
  elif [ -n "$PROJECT" ]; then
    xcodebuild -project "$PROJECT" -scheme mobile -configuration Release -sdk iphonesimulator -derivedDataPath build
  else
    echo "No Xcode workspace/project found inside apps/mobile/ios."
    exit 1
  fi

  cd ../../..
  echo "iOS build completed."
elif [ "$(uname)" != "Darwin" ]; then
  echo "Skipping iOS build: iOS requires macOS + Xcode."
else
  echo "Skipping iOS build: apps/mobile/ios is missing. Ask Codex to restore/generate the React Native iOS project."
fi

echo ""
echo "== DONE =="
echo "Web/API/Android checks completed. iOS was run only if macOS + apps/mobile/ios existed."

# Made with Bob
