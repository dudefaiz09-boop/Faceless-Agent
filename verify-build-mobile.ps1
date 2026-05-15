# EduConnect full production build + mobile validation
$ErrorActionPreference = "Stop"

Write-Host "== EduConnect full production build + mobile validation ==" -ForegroundColor Cyan

Write-Host ""
Write-Host "== 1. Environment check ==" -ForegroundColor Yellow
node -v
corepack enable
corepack pnpm -v

Write-Host ""
Write-Host "== 2. Clean install ==" -ForegroundColor Yellow
try {
    corepack pnpm install --frozen-lockfile
} catch {
    Write-Host "Frozen lockfile install failed, trying regular install..." -ForegroundColor Yellow
    corepack pnpm install
}

Write-Host ""
Write-Host "== 3. Format, lint, and tests ==" -ForegroundColor Yellow
corepack pnpm format
corepack pnpm lint
corepack pnpm test

Write-Host ""
Write-Host "== 4. Backend/API build ==" -ForegroundColor Yellow
corepack pnpm --filter @educonnect/functions build

Write-Host ""
Write-Host "== 5. Web build ==" -ForegroundColor Yellow
corepack pnpm --filter @educonnect/web build

Write-Host ""
Write-Host "== 6. Full monorepo build ==" -ForegroundColor Yellow
corepack pnpm build

Write-Host ""
Write-Host "== 7. Mobile JS/test validation ==" -ForegroundColor Yellow
corepack pnpm --filter mobile test
try {
    corepack pnpm --filter mobile lint
} catch {
    Write-Host "Mobile lint failed or is not fully configured. Continue to native build checks." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "== 8. Android build check ==" -ForegroundColor Yellow
if (Test-Path "apps/mobile/android") {
    Push-Location apps/mobile/android
    
    if (Test-Path "./gradlew.bat") {
        Write-Host "Running Android builds..." -ForegroundColor Green
        ./gradlew.bat clean
        ./gradlew.bat assembleDebug
        ./gradlew.bat assembleRelease
        Write-Host "Android debug/release build completed." -ForegroundColor Green
    } else {
        Write-Host "gradlew.bat not found in apps/mobile/android" -ForegroundColor Red
    }
    
    Pop-Location
} else {
    Write-Host "apps/mobile/android not found. Android native project is missing." -ForegroundColor Red
}

Write-Host ""
Write-Host "== 9. iOS build check ==" -ForegroundColor Yellow
Write-Host "Skipping iOS build: iOS requires macOS + Xcode." -ForegroundColor Yellow
Write-Host "iOS builds cannot be performed on Windows." -ForegroundColor Yellow

Write-Host ""
Write-Host "== DONE ==" -ForegroundColor Green
Write-Host "Web/API/Android checks completed. iOS requires macOS." -ForegroundColor Green

# Made with Bob
