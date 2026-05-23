$ErrorActionPreference = 'Stop'

$failures = New-Object System.Collections.Generic.List[string]

function Write-Section {
  param([Parameter(Mandatory = $true)][string]$Title)
  Write-Host ""
  Write-Host "==> $Title" -ForegroundColor Cyan
}

function Add-Failure {
  param([Parameter(Mandatory = $true)][string]$Message)
  $failures.Add($Message) | Out-Null
  Write-Host "FAIL: $Message" -ForegroundColor Red
}

function Add-Pass {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Host "PASS: $Message" -ForegroundColor Green
}

function Test-CommandExists {
  param([Parameter(Mandatory = $true)][string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Section 'Java'
if (-not $env:JAVA_HOME) {
  Add-Failure 'JAVA_HOME is not set.'
} elseif (-not (Test-Path $env:JAVA_HOME)) {
  Add-Failure "JAVA_HOME path does not exist: $env:JAVA_HOME"
} elseif ($env:JAVA_HOME.EndsWith('\bin')) {
  Add-Failure 'JAVA_HOME points to a bin folder. Set it to the JDK root folder instead.'
} else {
  Add-Pass "JAVA_HOME=$env:JAVA_HOME"
}

if (Test-CommandExists 'java') {
  java -version
} else {
  Add-Failure 'java is not available on PATH.'
}

Write-Section 'Android SDK'
$androidHome = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }
if (-not $androidHome) {
  Add-Failure 'Neither ANDROID_HOME nor ANDROID_SDK_ROOT is set.'
} elseif (-not (Test-Path $androidHome)) {
  Add-Failure "Android SDK path does not exist: $androidHome"
} else {
  Add-Pass "Android SDK=$androidHome"

  $platform34 = Join-Path $androidHome 'platforms\android-34'
  $buildTools34 = Join-Path $androidHome 'build-tools\34.0.0'
  $platformTools = Join-Path $androidHome 'platform-tools'

  if (Test-Path $platform34) { Add-Pass 'Android SDK Platform 34 is installed.' } else { Add-Failure 'Android SDK Platform 34 is missing.' }
  if (Test-Path $buildTools34) { Add-Pass 'Android SDK Build Tools 34.0.0 is installed.' } else { Add-Failure 'Android SDK Build Tools 34.0.0 is missing.' }
  if (Test-Path $platformTools) { Add-Pass 'Android platform-tools are installed.' } else { Add-Failure 'Android platform-tools are missing.' }
}

Write-Section 'ADB'
if (Test-CommandExists 'adb') {
  adb version
  adb devices
} else {
  Add-Failure 'adb is not available on PATH. Add Android SDK platform-tools to PATH.'
}

Write-Section 'Node and pnpm'
if (Test-CommandExists 'node') { node --version } else { Add-Failure 'node is not available on PATH.' }
if (Test-CommandExists 'corepack') { corepack pnpm --version } else { Add-Failure 'corepack is not available on PATH.' }

Write-Section 'Summary'
if ($failures.Count -gt 0) {
  Write-Host "Android environment preflight failed with $($failures.Count) issue(s):" -ForegroundColor Red
  foreach ($failure in $failures) {
    Write-Host "- $failure" -ForegroundColor Red
  }
  exit 1
}

Write-Host 'Android environment preflight passed.' -ForegroundColor Green
