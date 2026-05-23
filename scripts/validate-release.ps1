$ErrorActionPreference = 'Stop'

function Run-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][string[]]$Command
  )

  Write-Host ""
  Write-Host "==> $Label" -ForegroundColor Cyan
  & $Command[0] @($Command[1..($Command.Length - 1)])
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Label"
  }
}

Run-Step "Validate Android environment" @('powershell', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/check-android-env.ps1')
Run-Step "Install dependencies" @('corepack', 'pnpm', 'install', '--frozen-lockfile')
Run-Step "Check formatting" @('corepack', 'pnpm', 'format:check')
Run-Step "Audit web shared API boundaries" @('corepack', 'pnpm', 'audit:web-shared-api')
Run-Step "Lint workspace" @('corepack', 'pnpm', 'lint')
Run-Step "Run tests" @('corepack', 'pnpm', 'test')
Run-Step "Build shared package" @('corepack', 'pnpm', 'turbo', 'build', '--filter', '@educonnect/shared')
Run-Step "Build shared API package" @('corepack', 'pnpm', 'turbo', 'build', '--filter', '@educonnect/shared-api')
Run-Step "Build shared education package" @('corepack', 'pnpm', 'turbo', 'build', '--filter', '@educonnect/shared-education')
Run-Step "Build functions package" @('corepack', 'pnpm', 'turbo', 'build', '--filter', '@educonnect/functions')
Run-Step "Build web package" @('corepack', 'pnpm', 'turbo', 'build', '--filter', '@educonnect/web')
Run-Step "Typecheck mobile" @('corepack', 'pnpm', '--filter', 'mobile', 'typecheck')
Run-Step "Test mobile" @('corepack', 'pnpm', '--filter', 'mobile', 'test')
Run-Step "Build Android debug APK" @('corepack', 'pnpm', '--filter', 'mobile', 'build:android')

Write-Host ""
Write-Host "Release validation completed." -ForegroundColor Green
Write-Host "Expected APK: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk"
