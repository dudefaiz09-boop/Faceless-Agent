Set-Location $PSScriptRoot
$log = Join-Path $PSScriptRoot 'build-log.txt'
Remove-Item $log -ErrorAction SilentlyContinue

function Log($msg) {
  "$(Get-Date -Format o) $msg" | Tee-Object -FilePath $log -Append
}

try {
  Log 'pnpm format'
  pnpm format 2>&1 | Tee-Object -FilePath $log -Append
  if ($LASTEXITCODE -ne 0) { throw "format failed: $LASTEXITCODE" }

  Log 'pnpm format:check'
  pnpm format:check 2>&1 | Tee-Object -FilePath $log -Append
  if ($LASTEXITCODE -ne 0) { throw "format:check failed: $LASTEXITCODE" }

  Log 'functions build'
  pnpm --filter @educonnect/functions build 2>&1 | Tee-Object -FilePath $log -Append
  if ($LASTEXITCODE -ne 0) { throw "functions build failed: $LASTEXITCODE" }

  Log 'web build'
  pnpm --filter @educonnect/web build 2>&1 | Tee-Object -FilePath $log -Append
  if ($LASTEXITCODE -ne 0) { throw "web build failed: $LASTEXITCODE" }

  Log 'pnpm test'
  pnpm test 2>&1 | Tee-Object -FilePath $log -Append
  if ($LASTEXITCODE -ne 0) { throw "test failed: $LASTEXITCODE" }

  Log 'git commit'
  git add -A 2>&1 | Tee-Object -FilePath $log -Append
  git commit -m "fix: resolve PR #35 build failures for notifications and dropdown" 2>&1 | Tee-Object -FilePath $log -Append
  if ($LASTEXITCODE -ne 0) { Log 'commit skipped or failed' }

  Log 'git push'
  git push origin fix-repo-tests-and-types-10385705094009495592 2>&1 | Tee-Object -FilePath $log -Append
  git rev-parse HEAD 2>&1 | Tee-Object -FilePath $log -Append

  Log 'DONE OK'
} catch {
  Log "ERROR: $_"
  exit 1
}
